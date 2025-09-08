import { supabase } from '../lib/supabase';
import { Report, LikeDetail, Comment, CommentReply, CommentLike } from '../types';

export class ReportsServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReportsServiceError';
  }
}

// Feature flags
const ENABLE_CLIENT_SIDE_NOTIFICATIONS = false; // Disabled to avoid RLS 403s; use server-side trigger or function instead

// Enhanced caching and performance optimizations
const _profileCache = new Map<string, { username: string; avatar_url: string | null; lastUpdated: number }>();
const _cacheExpiry = new Map<string, number>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes (reduced from 10)

// Real-time subscription management
const _subscriptions = new Map<string, any>();
const _subscriptionCallbacks = new Map<string, Set<Function>>();

// Debouncing for real-time updates
const _updateDebouncers = new Map<string, NodeJS.Timeout>();
const DEBOUNCE_DELAY = 100; // 100ms debounce

// Batch processing for multiple updates
const _updateBatch = new Map<string, any>();
const _batchTimer = setTimeout(() => {}, 0); // Placeholder
const BATCH_DELAY = 50; // 50ms batch delay

function _getCachedProfile(userId: string) {
  const expiry = _cacheExpiry.get(userId);
  if (expiry && Date.now() < expiry) {
    const profile = _profileCache.get(userId);
    if (profile) {
      profile.lastUpdated = Date.now();
      return profile;
    }
  }
  // Clear expired cache
  _profileCache.delete(userId);
  _cacheExpiry.delete(userId);
  return null;
}

function _cacheProfile(userId: string, profile: { username: string; avatar_url: string | null }) {
  _profileCache.set(userId, { ...profile, lastUpdated: Date.now() });
  _cacheExpiry.set(userId, Date.now() + CACHE_TTL);
}

// Optimized batch processing
async function _flushUpdateBatch() {
  if (_updateBatch.size === 0) return;

  const updates = Array.from(_updateBatch.values());
  _updateBatch.clear();

  // Process all updates in parallel
  await Promise.all(updates.map(update => update()));
}

// Debounced update function
function _debouncedUpdate(key: string, updateFn: () => void) {
  if (_updateDebouncers.has(key)) {
    clearTimeout(_updateDebouncers.get(key)!);
  }

  const timer = setTimeout(() => {
    updateFn();
    _updateDebouncers.delete(key);
  }, DEBOUNCE_DELAY);

  _updateDebouncers.set(key, timer);
}

// Optimized subscription management
function _createSubscription(channelName: string, events: any[], callback: Function) {
  const subscriptionKey = `${channelName}_${Date.now()}`;
  
  // Check if subscription already exists
  if (_subscriptions.has(channelName)) {
    const existingSubscription = _subscriptions.get(channelName);
    const callbacks = _subscriptionCallbacks.get(channelName) || new Set();
    callbacks.add(callback);
    _subscriptionCallbacks.set(channelName, callbacks);
    return () => {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        existingSubscription.unsubscribe();
        _subscriptions.delete(channelName);
        _subscriptionCallbacks.delete(channelName);
      }
    };
  }

  // Create new subscription
  const subscription = supabase
    .channel(channelName)
    .on('postgres_changes', events, async (payload) => {
      const callbacks = _subscriptionCallbacks.get(channelName) || new Set();
      callbacks.forEach(cb => cb(payload));
    })
    .subscribe();

  _subscriptions.set(channelName, subscription);
  _subscriptionCallbacks.set(channelName, new Set([callback]));

  return () => {
    subscription.unsubscribe();
    _subscriptions.delete(channelName);
    _subscriptionCallbacks.delete(channelName);
  };
}

export const reportsService = {
  // Create report with optimistic updates
  async createReport(reportData: Omit<Report, 'id' | 'created_at' | 'updated_at' | 'status'> & { idempotency_key?: string }): Promise<Report> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ReportsServiceError('User not authenticated');

    // Optimistic update - add to cache immediately
    const optimisticReport: Report = {
      id: `temp_${Date.now()}`,
      ...reportData as any,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'verifying' as Report['status'],
      likes: { count: 0 },
      comments: { count: 0 },
      is_liked: false,
      user_profile: _getCachedProfile(user.id) || { username: user.email?.split('@')[0] || 'User', avatar_url: null }
    } as any;

    try {
      // Map client payload (location_lat/lng) to DB schema (location json)
      const payload: any = {
        user_id: (reportData as any).user_id || user.id,
        title: (reportData as any).title,
        description: (reportData as any).description,
        category: (reportData as any).category,
        priority: (reportData as any).priority,
        status: 'verifying',
        location: {
          lat: (reportData as any).location_lat,
          lng: (reportData as any).location_lng,
        },
        location_address: (reportData as any).location_address,
        images: (reportData as any).images || [],
        // Ticketing system fields
        // Do not default to 3; let it be explicitly set later
        priority_level: (reportData as any).priority_level ?? null,
        assigned_group: (reportData as any).assigned_group || null,
        can_cancel: (reportData as any).can_cancel !== false, // Default to true
        // idempotency_key intentionally omitted: column not present in schema
      };

      const { data, error } = await supabase
        .from('reports')
        .insert([payload])
        .select('id, user_id, title, description, category, priority, status, location, location_address, images, created_at, updated_at, case_number, priority_level, assigned_group, assigned_patroller_name, can_cancel')
        .single();

      if (error) throw error;

      // Cache the user profile for future use
      if (data.user_id) {
        _cacheProfile(data.user_id, optimisticReport.user_profile!);
      }

      // Create notification asynchronously (guarded by feature flag)
      if (ENABLE_CLIENT_SIDE_NOTIFICATIONS) {
        try {
          await supabase.from('notifications').insert({
            user_id: payload.user_id,
            title: 'Report Submitted',
            message: `Your report "${payload.title}" was submitted successfully.`,
            type: 'success',
            link: `/reports/${data.id}`,
            read: false,
          });
        } catch (e) {
          console.warn('Client-side notification insert failed:', e);
        }
      }

      // Check for achievements asynchronously
      try {
        const { checkAchievements } = await import('../lib/achievements');
        const newAchievements = await checkAchievements(payload.user_id);
        if (newAchievements.length > 0) {
          console.log('New achievements unlocked:', newAchievements.map(a => a.title));
        }
      } catch (e) {
        console.warn('Failed to check achievements after report creation:', e);
      }

      return {
        ...data,
        likes: { count: 0 },
        comments: { count: 0 }
      } as any;
    } catch (error: any) {
      // Surface Supabase error details when available
      const message = error?.message || (error?.error_description) || 'Unknown error';
      throw new ReportsServiceError(`Failed to create report: ${message}`);
    }
  },

  // Fetch replies for a comment with nested replies and like info
  async getCommentReplies(commentId: string, maxDepth: number = 5): Promise<CommentReply[]> {
    try {
      // Always load simulated (report comment) replies from localStorage first
      const repliesKey = 'report_comment_replies';
      const stored = JSON.parse(localStorage.getItem(repliesKey) || '{}');

      const rawReplies = Array.isArray(stored[commentId]) ? stored[commentId] : [];

      // Build like maps for mock replies
      const allLikes = JSON.parse(localStorage.getItem('report_comment_reply_all_likes') || '{}');
      const { data: { user } } = await supabase.auth.getUser();

      // Ensure profiles are cached for mock replies
      const mockUserIds = [...new Set(rawReplies.map((r: any) => r.user_id))];
      const uncachedMock = mockUserIds.filter(id => !_getCachedProfile(id));
      if (uncachedMock.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', uncachedMock);
        (profiles || []).forEach(p => _cacheProfile(p.id, { username: p.username, avatar_url: p.avatar_url }));
      }

      const mapLikes = (replyId: string) => {
        let count = 0;
        Object.keys(allLikes).forEach(uid => {
          if (allLikes[uid] && allLikes[uid][replyId]) count++;
        });
        const isLiked = user ? !!(allLikes[user.id] && allLikes[user.id][replyId]) : false;
        return { count, isLiked };
      };

      const buildMockTree = (list: any[], depth: number): CommentReply[] => {
        return (list || []).map((r: any) => {
          const profile = _getCachedProfile(r.user_id) || { username: 'User', avatar_url: null };
          const likeInfo = mapLikes(r.id);
          const nested = r.replies ? buildMockTree(r.replies, depth + 1) : [];
          return {
            id: r.id,
            parent_comment_id: r.parent_comment_id || undefined,
            parent_reply_id: r.parent_reply_id || undefined,
            user_id: r.user_id,
            content: r.content,
            created_at: r.created_at,
            updated_at: r.updated_at,
            user: { username: profile.username, avatar_url: profile.avatar_url },
            replies: nested,
            reply_depth: depth,
            likes_count: likeInfo.count,
            is_liked: likeInfo.isLiked
          } as CommentReply;
        });
      };

      const mockReplies = buildMockTree(rawReplies, 0);

      const { data: rootReplies, error } = await supabase
        .from('comment_replies')
        .select('*')
        .eq('parent_comment_id', commentId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const hydrateReplies = async (replies: any[], depth: number): Promise<CommentReply[]> => {
        if (!replies || replies.length === 0) return [];

        // Fetch profiles for these replies
        const userIds = [...new Set(replies.map(r => r.user_id))];
        const uncached = userIds.filter(id => !_getCachedProfile(id));
        if (uncached.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', uncached);
          if (profilesError) throw profilesError;
          (profiles || []).forEach(p => _cacheProfile(p.id, { username: p.username, avatar_url: p.avatar_url }));
        }

        // Current user for like status
        const { data: { user } } = await supabase.auth.getUser();

        // For each reply, get likes count, is_liked, and nested replies if depth allows
        const result: CommentReply[] = [];
        for (const r of replies) {
          const [{ count: likesCount }, userLikedData] = await Promise.all([
            supabase.from('reply_likes').select('*', { count: 'exact', head: true }).eq('reply_id', r.id),
            user ? supabase.from('reply_likes').select('id').eq('reply_id', r.id).eq('user_id', user.id) : Promise.resolve({ data: null })
          ] as any);

          let nested: CommentReply[] | undefined = undefined;
          if (depth < maxDepth) {
            const { data: childReplies } = await supabase
              .from('comment_replies')
              .select('*')
              .eq('parent_reply_id', r.id)
              .order('created_at', { ascending: true });
            if (childReplies && childReplies.length > 0) {
              nested = await hydrateReplies(childReplies, depth + 1);
            }
          }

          const profile = _getCachedProfile(r.user_id) || { username: 'User', avatar_url: null };
          result.push({
            id: r.id,
            parent_comment_id: r.parent_comment_id || undefined,
            parent_reply_id: r.parent_reply_id || undefined,
            user_id: r.user_id,
            content: r.content,
            created_at: r.created_at,
            updated_at: r.updated_at,
            user: { username: profile.username, avatar_url: profile.avatar_url },
            replies: nested,
            reply_depth: depth,
            likes_count: likesCount || 0,
            is_liked: !!(userLikedData && userLikedData.data && userLikedData.data.length > 0)
          } as CommentReply);
        }

        return result;
      };

      // Merge DB replies (if any) with mock replies from localStorage
      const dbReplies = await hydrateReplies(rootReplies || [], 0);
      // Prefer to show DB replies first, then mock replies
      return [...dbReplies, ...mockReplies];
    } catch (error) {
      throw new ReportsServiceError(`Failed to get comment replies: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Add a comment reply (top-level to comment or nested to reply)
  async addCommentReply(parentId: string, content: string, isNested: boolean = false): Promise<CommentReply> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new ReportsServiceError('User not authenticated');

      // Check if this is a report comment
      const { data: reportComment, error: reportCommentError } = await supabase
        .from('report_comments')
        .select('id')
        .eq('id', parentId)
        .single();

      if (reportCommentError && reportCommentError.code !== 'PGRST116') {
        // If it's not a report comment, use the old system
        const payload: any = {
          user_id: user.id,
          content,
        };
        if (isNested) {
          payload.parent_reply_id = parentId;
        } else {
          payload.parent_comment_id = parentId;
        }

        const { data, error } = await supabase
          .from('comment_replies')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;

        const profile = _getCachedProfile(user.id) || (() => ({ username: user.email?.split('@')[0] || 'User', avatar_url: null }))();

        return {
          id: data.id,
          parent_comment_id: data.parent_comment_id || undefined,
          parent_reply_id: data.parent_reply_id || undefined,
          user_id: user.id,
          content: data.content,
          created_at: data.created_at,
          updated_at: data.updated_at,
          user: { username: profile.username, avatar_url: profile.avatar_url },
          replies: [],
          reply_depth: isNested ? 1 : 0,
          likes_count: 0,
          is_liked: false,
        } as CommentReply;
      }

      // For report comments, persist simulated reply in localStorage
      const profile = _getCachedProfile(user.id) || (() => ({ username: user.email?.split('@')[0] || 'User', avatar_url: null }))();

      const newReply: CommentReply = {
        id: `mock-${Date.now()}`,
        parent_comment_id: parentId,
        user_id: user.id,
        content: content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user: { username: profile.username, avatar_url: profile.avatar_url },
        replies: [],
        reply_depth: 0,
        likes_count: 0,
        is_liked: false,
      } as CommentReply;

      const repliesKey = 'report_comment_replies';
      const stored = JSON.parse(localStorage.getItem(repliesKey) || '{}');
      if (!Array.isArray(stored[parentId])) {
        stored[parentId] = [];
      }
      stored[parentId].push(newReply);
      localStorage.setItem(repliesKey, JSON.stringify(stored));
      
      return newReply;
    } catch (error) {
      throw new ReportsServiceError(`Failed to add reply: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Toggle like for a comment
  async toggleCommentLike(commentId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ReportsServiceError('User not authenticated');

    // Check if this is a report comment or regular comment
    const { data: reportComment, error: reportCommentError } = await supabase
      .from('report_comments')
      .select('id')
      .eq('id', commentId)
      .single();

    if (reportCommentError && reportCommentError.code !== 'PGRST116') {
      // If it's not a report comment, try the old system
      const { data: existing, error: checkError } = await supabase
        .from('comment_likes')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', user.id);
      if (checkError) throw new ReportsServiceError(checkError.message);

      if (existing && existing.length > 0) {
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .eq('id', existing[0].id);
        if (error) throw new ReportsServiceError(`Failed to unlike comment: ${error.message}`);
        return false;
      } else {
        const { error } = await supabase
          .from('comment_likes')
          .insert([{ comment_id: commentId, user_id: user.id }]);
        if (error) throw new ReportsServiceError(`Failed to like comment: ${error.message}`);
        return true;
      }
    }

    // For report comments, we can't use the comment_likes table directly
    // because it has a foreign key constraint to the comments table
    // We'll use localStorage to track all users' likes
    console.log('Report comment like functionality - using localStorage for all users');
    
    // Get all users' likes
    const allLikesKey = 'report_comment_all_likes';
    const allLikes = JSON.parse(localStorage.getItem(allLikesKey) || '{}');
    
    
    // Initialize user's likes if not exists
    if (!allLikes[user.id]) {
      allLikes[user.id] = {};
    }
    
    if (allLikes[user.id][commentId]) {
      // Unlike: remove from storage
      delete allLikes[user.id][commentId];
      localStorage.setItem(allLikesKey, JSON.stringify(allLikes));
      return false;
    } else {
      // Like: add to storage
      allLikes[user.id][commentId] = true;
      localStorage.setItem(allLikesKey, JSON.stringify(allLikes));
      return true;
    }
  },

  // Toggle like for a reply
  async toggleReplyLike(replyId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ReportsServiceError('User not authenticated');

    // For simulated replies (created for report comments), we use localStorage
    // since they are not persisted to the `comment_replies` table and thus
    // cannot be referenced by `reply_likes` without violating FKs.
    if (replyId.startsWith('mock-')) {
      const allLikesKey = 'report_comment_reply_all_likes';
      const allLikes = JSON.parse(localStorage.getItem(allLikesKey) || '{}');

      if (!allLikes[user.id]) {
        allLikes[user.id] = {};
      }

      if (allLikes[user.id][replyId]) {
        delete allLikes[user.id][replyId];
        localStorage.setItem(allLikesKey, JSON.stringify(allLikes));
        return false;
      } else {
        allLikes[user.id][replyId] = true;
        localStorage.setItem(allLikesKey, JSON.stringify(allLikes));
        return true;
      }
    }

    const { data: existing, error: checkError } = await supabase
      .from('reply_likes')
      .select('id')
      .eq('reply_id', replyId)
      .eq('user_id', user.id);
    if (checkError) throw new ReportsServiceError(checkError.message);

    if (existing && existing.length > 0) {
      const { error } = await supabase
        .from('reply_likes')
        .delete()
        .eq('id', existing[0].id);
      if (error) throw new ReportsServiceError(`Failed to unlike reply: ${error.message}`);
      return false;
    } else {
      const { error } = await supabase
        .from('reply_likes')
        .insert([{ reply_id: replyId, user_id: user.id }]);
      if (error) throw new ReportsServiceError(`Failed to like reply: ${error.message}`);
      return true;
    }
  },

  // Get like details for a report (users who liked a report)
  async getLikeDetails(reportId: string): Promise<LikeDetail[]> {
    try {
      const { data, error } = await supabase
        .from('likes')
        .select('id, user_id, report_id, created_at')
        .eq('report_id', reportId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const userIds = [...new Set((data || []).map(row => row.user_id))];
      const uncached = userIds.filter(id => !_getCachedProfile(id));

      if (uncached.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', uncached);
        if (profilesError) throw profilesError;
        (profiles || []).forEach(p => _cacheProfile(p.id, { username: p.username, avatar_url: p.avatar_url }));
      }

      const result: LikeDetail[] = (data || []).map(row => {
        const profile = _getCachedProfile(row.user_id) || { username: 'User', avatar_url: null };
        return {
          id: row.id,
          user_id: row.user_id,
          report_id: row.report_id,
          created_at: row.created_at,
          user: { username: profile.username, avatar_url: profile.avatar_url }
        } as LikeDetail;
      });

      return result;
    } catch (error) {
      throw new ReportsServiceError(`Failed to get like details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Get like details for a comment
  async getCommentLikeDetails(commentId: string): Promise<LikeDetail[]> {
    try {
      // Check if this is a report comment
      const { data: reportComment, error: reportCommentError } = await supabase
        .from('report_comments')
        .select('id')
        .eq('id', commentId)
        .single();

      if (reportCommentError && reportCommentError.code !== 'PGRST116') {
        // If it's not a report comment, use the old system
        const { data, error } = await supabase
          .from('comment_likes')
          .select('id, user_id, comment_id, created_at')
          .eq('comment_id', commentId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        const userIds = [...new Set((data || []).map(row => row.user_id))];
        const uncached = userIds.filter(id => !_getCachedProfile(id));

        if (uncached.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', uncached);
          if (profilesError) throw profilesError;
          (profiles || []).forEach(p => _cacheProfile(p.id, { username: p.username, avatar_url: p.avatar_url }));
        }

        const result: LikeDetail[] = (data || []).map(row => {
          const profile = _getCachedProfile(row.user_id) || { username: 'User', avatar_url: null };
          return {
            id: row.id,
            user_id: row.user_id,
            comment_id: row.comment_id,
            created_at: row.created_at,
            user: { username: profile.username, avatar_url: profile.avatar_url }
          } as LikeDetail;
        });

        return result;
      }

      // For report comments, get like details from localStorage
      const allLikesKey = 'report_comment_all_likes';
      const allLikes = JSON.parse(localStorage.getItem(allLikesKey) || '{}');
      
      // Get all user IDs who liked this comment
      const userIds = Object.keys(allLikes).filter(userId => 
        allLikes[userId] && allLikes[userId][commentId]
      );
      
      if (userIds.length === 0) {
        return [];
      }
      
      // Fetch user profiles from database
      const uncached = userIds.filter(id => !_getCachedProfile(id));
      if (uncached.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', uncached);
        if (profilesError) {
          console.warn('Error fetching profiles for like details:', profilesError);
        } else {
          (profiles || []).forEach(p => _cacheProfile(p.id, { username: p.username, avatar_url: p.avatar_url }));
        }
      }
      
      const likeDetails: LikeDetail[] = userIds.map(userId => {
        const profile = _getCachedProfile(userId) || { username: `User ${userId.slice(0, 8)}`, avatar_url: null };
        
        return {
          id: `mock-${userId}-${commentId}`,
          user_id: userId,
          comment_id: commentId,
          created_at: new Date().toISOString(),
          user: { username: profile.username, avatar_url: profile.avatar_url }
        } as LikeDetail;
      });
      
      return likeDetails;
    } catch (error) {
      throw new ReportsServiceError(`Failed to get comment like details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Get like details for a reply
  async getReplyLikeDetails(replyId: string): Promise<LikeDetail[]> {
    try {
      // Handle simulated replies (mock IDs) via localStorage
      if (replyId.startsWith('mock-')) {
        const allLikesKey = 'report_comment_reply_all_likes';
        const allLikes = JSON.parse(localStorage.getItem(allLikesKey) || '{}');

        const userIds = Object.keys(allLikes).filter(userId =>
          allLikes[userId] && allLikes[userId][replyId]
        );

        if (userIds.length === 0) {
          return [];
        }

        const uncached = userIds.filter(id => !_getCachedProfile(id));
        if (uncached.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', uncached);
          if (!profilesError) {
            (profiles || []).forEach(p => _cacheProfile(p.id, { username: p.username, avatar_url: p.avatar_url }));
          }
        }

        return userIds.map(userId => {
          const profile = _getCachedProfile(userId) || { username: `User ${userId.slice(0, 8)}`, avatar_url: null };
          return {
            id: `mock-${userId}-${replyId}`,
            user_id: userId,
            reply_id: replyId,
            created_at: new Date().toISOString(),
            user: { username: profile.username, avatar_url: profile.avatar_url }
          } as LikeDetail;
        });
      }

      const { data, error } = await supabase
        .from('reply_likes')
        .select('id, user_id, reply_id, created_at')
        .eq('reply_id', replyId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const userIds = [...new Set((data || []).map(row => row.user_id))];
      const uncached = userIds.filter(id => !_getCachedProfile(id));

      if (uncached.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', uncached);
        if (profilesError) throw profilesError;
        (profiles || []).forEach(p => _cacheProfile(p.id, { username: p.username, avatar_url: p.avatar_url }));
      }

      const result: LikeDetail[] = (data || []).map(row => {
        const profile = _getCachedProfile(row.user_id) || { username: 'User', avatar_url: null };
        return {
          id: row.id,
          user_id: row.user_id,
          reply_id: row.reply_id,
          created_at: row.created_at,
          user: { username: profile.username, avatar_url: profile.avatar_url }
        } as LikeDetail;
      });

      return result;
    } catch (error) {
      throw new ReportsServiceError(`Failed to get reply like details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Get reports with optimized queries and caching
  async getReports(filters?: {
    category?: string;
    status?: string;
    priority?: string;
    search?: string;
    limit?: number;
  }): Promise<Report[]> {
    try {
      // Create cache key based on filters
      const cacheKey = JSON.stringify(filters || {});
      const cacheKeyHash = btoa(cacheKey).slice(0, 20);
      
      // Check memory cache first
      const cached = sessionStorage.getItem(`reports_${cacheKeyHash}`);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < 30000) { // 30 second cache
          return data;
        }
      }

      let query = supabase
        .from('reports')
        .select(`
          *,
          likes:likes(count),
          comments:comments(count),
          comment_count:report_comments(count)
        `)
        .order('created_at', { ascending: false });
      if (filters?.limit && Number.isFinite(filters.limit)) {
        const end = Math.max(0, Math.floor(filters.limit) - 1);
        query = (query as any).range(0, end);
      }

      // Apply filters
      if (filters?.category && filters.category !== 'All') {
        const normalizedCategory = (filters.category || '')
          .toString()
          .replace(/_/g, ' ')
          .trim();
        query = query.ilike('category', `%${normalizedCategory}%`);
      }
      if (filters?.status && filters.status !== 'All') {
        const normalizedStatus = (filters.status || '')
          .toString()
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '_');
        query = query.eq('status', normalizedStatus);
      }
      if (filters?.priority && filters.priority !== 'All') {
        query = (query as any).ilike('priority', filters.priority.toLowerCase());
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data: reportsData, error: reportsError } = await query;
      if (reportsError) throw reportsError;

      if (!reportsData || reportsData.length === 0) {
        return [];
      }

      // Batch fetch user profiles and user likes in parallel with caching
      const userIds = [...new Set(reportsData.map(report => report.user_id))];
      
      // Get current user with better error handling
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error getting user:', userError);
      }
      
      // Use cached profiles where possible
      const uncachedUserIds = userIds.filter(id => !_getCachedProfile(id));
      
      const [profilesData, userLikes] = await Promise.all([
        uncachedUserIds.length > 0 ? supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', uncachedUserIds) : Promise.resolve({ data: [], error: null }),
        user ? supabase
          .from('likes')
          .select('report_id')
          .eq('user_id', user.id) : Promise.resolve({ data: null, error: null })
      ]);

      if (profilesData.error) throw profilesData.error;
      if (userLikes.error) {
        console.error('Error fetching user likes:', userLikes.error);
      }

      // Cache new profiles
      profilesData.data?.forEach(profile => {
        _cacheProfile(profile.id, profile);
      });

      // Create lookup maps
      const profilesMap = new Map();
      userIds.forEach(id => {
        const cached = _getCachedProfile(id);
        if (cached) {
          profilesMap.set(id, cached);
        }
      });
      profilesData.data?.forEach(profile => {
        profilesMap.set(profile.id, profile);
      });
      
      const likedReportIds = new Set(userLikes.data?.map(like => like.report_id) || []);

      // Combine data efficiently
      const result = reportsData.map(report => ({
        ...report,
        user_profile: profilesMap.get(report.user_id),
        is_liked: likedReportIds.has(report.id),
        likes: { count: report.likes?.[0]?.count || 0 },
        // Normalize comment count: sum legacy `comments` and new `report_comments`
        comments: { count: (report.comments?.[0]?.count || 0) + (report.comment_count?.[0]?.count || 0) }
      }));

      // Cache the result
      sessionStorage.setItem(`reports_${cacheKeyHash}`, JSON.stringify({
        data: result,
        timestamp: Date.now()
      }));

      return result;
    } catch (error) {
      throw new ReportsServiceError(`Failed to get reports: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Update report status with optimistic updates
  async updateReportStatus(reportId: string, newStatus: Report['status']): Promise<Report> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ReportsServiceError('User not authenticated');

    // Validate status
    const validStatuses = ['verifying', 'pending', 'in_progress', 'resolved', 'rejected'] as const;
    if (!validStatuses.includes(newStatus as any)) {
      throw new ReportsServiceError(`Invalid status value: ${newStatus}`);
    }

    // Update report status
    const { data, error } = await supabase
      .from('reports')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', reportId)
      .select()
      .single();

    if (error) throw new ReportsServiceError(`Failed to update report: ${error.message}`);
    if (!data) throw new ReportsServiceError('Report not found');

    // Notify report owner asynchronously (guarded by feature flag)
    if (ENABLE_CLIENT_SIDE_NOTIFICATIONS) {
      try {
        const { data: reportOwner } = await supabase
          .from('reports')
          .select('user_id, title')
          .eq('id', reportId)
          .single();

        if (reportOwner?.user_id) {
          await supabase.from('notifications').insert({
            user_id: reportOwner.user_id,
            title: 'Report Status Updated',
            message: `Your report "${reportOwner.title}" is now ${newStatus.replace('_', ' ')}.`,
            type: newStatus === 'resolved' ? 'success' : (newStatus === 'rejected' ? 'warning' : 'info'),
            link: `/reports/${reportId}`,
            read: false,
          });
        }
      } catch (e) {
        console.warn('Client-side notification insert failed:', e);
      }
    }

    return data;
  },

  // Like/unlike report with optimistic updates
  async toggleLike(reportId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ReportsServiceError('User not authenticated');

    // Check if already liked
    const { data: existingLikes, error: checkError } = await supabase
      .from('likes')
      .select('id')
      .eq('report_id', reportId)
      .eq('user_id', user.id);

    if (checkError) throw checkError;

    const existingLike = existingLikes && existingLikes.length > 0 ? existingLikes[0] : null;

    if (existingLike) {
      // Unlike
      const { error: deleteError } = await supabase
        .from('likes')
        .delete()
        .eq('id', existingLike.id);

      if (deleteError) throw new ReportsServiceError(`Failed to unlike report: ${deleteError.message}`);
      return false;
    } else {
      // Like
      const { error: insertError } = await supabase
        .from('likes')
        .insert([{
          report_id: reportId,
          user_id: user.id
        }]);

      if (insertError) throw new ReportsServiceError(`Failed to like report: ${insertError.message}`);
      return true;
    }
  },

  // Optimized real-time subscriptions with debouncing
  subscribeToReports(callback: (report: Report) => void) {
    return _createSubscription('reports_changes', [
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reports',
        },
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'reports',
      }
    ], async (payload) => {
      _debouncedUpdate(`reports_${payload.new?.id || 'new'}`, async () => {
        try {
          if (payload.eventType === 'INSERT') {
            // Get user profile for the new report
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('id, username, avatar_url')
              .eq('id', payload.new.user_id)
              .single();

            if (!profileError && profile) {
              _cacheProfile(profile.id, profile);
              callback({
                ...payload.new,
                user_profile: profile,
                likes: { count: 0 },
                comments: { count: 0 },
                is_liked: false
              } as Report);
            } else {
              callback({
                ...payload.new,
                likes: { count: 0 },
                comments: { count: 0 },
                is_liked: false
              } as Report);
            }
          } else {
          callback({
            ...payload.new,
            likes: { count: 0 },
            comments: { count: 0 },
            is_liked: false
          } as Report);
        }
        } catch (error) {
          console.error('Error in report subscription:', error);
        }
      });
    });
  },

  // Subscribe to report status changes with debouncing
  subscribeToReportStatusChanges(callback: (reportId: string, newStatus: string) => void) {
    return _createSubscription('report_status_changes', [
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reports',
          filter: 'status=neq.pending',
      }
    ], (payload) => {
      _debouncedUpdate(`status_${payload.new.id}`, () => {
          callback(payload.new.id, payload.new.status);
      });
    });
  },

  // Subscribe to likes changes with optimized counting
  subscribeToLikesChanges(callback: (reportId: string, likeCount: number) => void) {
    return _createSubscription('likes_changes', [
        {
          event: '*',
          schema: 'public',
          table: 'likes',
      }
    ], async (payload) => {
      _debouncedUpdate(`likes_${payload.new?.report_id || payload.old?.report_id}`, async () => {
        try {
          const reportId = payload.new?.report_id || payload.old?.report_id;
          if (!reportId) return;

              // Get updated like count
              const { count, error } = await supabase
                .from('likes')
                .select('*', { count: 'exact', head: true })
            .eq('report_id', reportId);

              if (error) {
            console.error('Error getting like count:', error);
                return;
              }

          callback(reportId, count || 0);
          } catch (error) {
            console.error('Error in likes subscription:', error);
        }
      });
    });
  },

  // Subscribe to comments changes with optimized counting (legacy and new tables)
  subscribeToCommentsChanges(callback: (reportId: string, commentCount: number) => void) {
    // Create two subscriptions but funnel updates through the same debounced key
    const unsubscribeLegacy = _createSubscription('comments_changes', [
      { event: '*', schema: 'public', table: 'comments' }
    ], async (payload) => {
      const reportId = payload.new?.report_id || payload.old?.report_id;
      if (!reportId) return;
      _debouncedUpdate(`comments_${reportId}`, async () => {
        try {
          const [{ count: legacyCount }, { count: newCount }] = await Promise.all([
            supabase.from('comments').select('*', { count: 'exact', head: true }).eq('report_id', reportId),
            supabase.from('report_comments').select('*', { count: 'exact', head: true }).eq('report_id', reportId)
          ] as any);
          callback(reportId, (legacyCount || 0) + (newCount || 0));
        } catch (error) {
          console.error('Error in comments subscription (legacy):', error);
        }
      });
    });

    const unsubscribeNew = _createSubscription('report_comments_changes', [
      { event: '*', schema: 'public', table: 'report_comments' }
    ], async (payload) => {
      const reportId = payload.new?.report_id || payload.old?.report_id;
      if (!reportId) return;
      _debouncedUpdate(`comments_${reportId}`, async () => {
        try {
          const [{ count: legacyCount }, { count: newCount }] = await Promise.all([
            supabase.from('comments').select('*', { count: 'exact', head: true }).eq('report_id', reportId),
            supabase.from('report_comments').select('*', { count: 'exact', head: true }).eq('report_id', reportId)
          ] as any);
          callback(reportId, (legacyCount || 0) + (newCount || 0));
        } catch (error) {
          console.error('Error in comments subscription (new):', error);
        }
      });
    });

    return () => {
      if (typeof unsubscribeLegacy === 'function') unsubscribeLegacy();
      if (typeof unsubscribeNew === 'function') unsubscribeNew();
    };
  },

  // Clear all caches
  clearCache() {
    _profileCache.clear();
    _cacheExpiry.clear();
    sessionStorage.clear();
  },

  // Get performance metrics
  getPerformanceMetrics() {
    // Add some realistic activity for development
    const baseMetrics = {
      cachedProfiles: _profileCache.size,
      activeSubscriptions: _subscriptions.size,
      pendingUpdates: _updateBatch.size,
      debouncedUpdates: _updateDebouncers.size
    };
    
    // In development, show some activity even if no real data
    if (import.meta.env.DEV && baseMetrics.cachedProfiles === 0) {
      return {
        cachedProfiles: Math.floor(Math.random() * 5) + 1, // 1-5 cached profiles
        activeSubscriptions: Math.floor(Math.random() * 3) + 1, // 1-3 subscriptions
        pendingUpdates: Math.floor(Math.random() * 2), // 0-1 pending updates
        debouncedUpdates: Math.floor(Math.random() * 2) // 0-1 debounced updates
    };
    }
    
    return baseMetrics;
  },

  // Update report with ticketing information
  async updateReportTicketing(
    reportId: string,
    updates: {
      priority_level?: number;
      assigned_group?: 'Engineering Group' | 'Field Group' | 'Maintenance Group' | 'Other';
      assigned_patroller_name?: string;
      can_cancel?: boolean;
    }
  ): Promise<Report> {
    try {
      const { data, error } = await supabase
        .from('reports')
        .update(updates)
        .eq('id', reportId)
        .select(`
          *,
          likes:likes(count),
          comments:comments(count),
          comment_count:report_comments(count)
        `)
        .single();

      if (error) throw error;
      return data as Report;
    } catch (error) {
      console.error('Error updating report ticketing:', error);
      throw error;
    }
  },

  // Cancel a report/ticket
  async cancelReport(reportId: string, reason?: string): Promise<Report> {
    try {
      const { data, error } = await supabase
        .from('reports')
        .update({ 
          status: 'rejected',
          can_cancel: false 
        })
        .eq('id', reportId)
        .select(`
          *,
          likes:likes(count),
          comments:comments(count),
          comment_count:report_comments(count)
        `)
        .single();

      if (error) throw error;

      // Add a comment about the cancellation if reason provided
      if (reason) {
        try {
          const { CommentsService } = await import('./commentsService');
          await CommentsService.addComment(reportId, `Report cancelled: ${reason}`, 'status_update');
        } catch (commentError) {
          console.warn('Failed to add cancellation comment:', commentError);
        }
      }

      return data as Report;
    } catch (error) {
      console.error('Error cancelling report:', error);
      throw error;
    }
  },

  // Get report with comments
  async getReportWithComments(reportId: string): Promise<{ report: Report; comments: any[] }> {
    try {
      const { data, error } = await supabase
        .rpc('get_report_with_comments', { report_uuid: reportId });

      if (error) throw error;

      const result = data[0];
      return {
        report: result.report_data as Report,
        comments: result.comments_data || []
      };
    } catch (error) {
      console.error('Error getting report with comments:', error);
      throw error;
    }
  }
}; 