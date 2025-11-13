import { supabase } from '../lib/supabase';
import { Report, LikeDetail, Comment, CommentReply, CommentLike } from '../types';
import { useAuthStore } from '../store/authStore';
import { authenticatedRequest } from '../lib/jwt';
import { getApiUrl } from '../lib/config';
import { checkAchievements } from '../lib/achievements';
import { CommentsService } from './commentsService';
import { formatStatusForDisplay } from '../lib/badges';

export class ReportsServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReportsServiceError';
  }
}

// Helper function to get current user from auth store
function getCurrentUser() {
  const { user, isAuthenticated } = useAuthStore.getState();
  if (!isAuthenticated || !user) {
    throw new ReportsServiceError('User not authenticated');
  }
  return user;
}

// Feature flags
const ENABLE_CLIENT_SIDE_NOTIFICATIONS = false;

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

const REPORT_REPLY_LIKES_KEY = 'report_comment_reply_all_likes';
const _reportReplyTypeCache = new Map<string, boolean>();

function _getLocalReportReplyLikes(): Record<string, Record<string, boolean>> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(REPORT_REPLY_LIKES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (error) {
    console.warn('Failed to parse report reply likes cache:', error);
    return {};
  }
}

function _setLocalReportReplyLikes(map: Record<string, Record<string, boolean>>) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(REPORT_REPLY_LIKES_KEY, JSON.stringify(map));
  } catch (error) {
    console.warn('Failed to persist report reply likes cache:', error);
  }
}

function _toggleLocalReportReplyLike(replyId: string, userId: string): boolean {
  const likes = _getLocalReportReplyLikes();
  if (!likes[userId]) {
    likes[userId] = {};
  }
  const currentlyLiked = !!likes[userId][replyId];
  if (currentlyLiked) {
    delete likes[userId][replyId];
    if (Object.keys(likes[userId]).length === 0) {
      delete likes[userId];
    }
  } else {
    likes[userId][replyId] = true;
  }
  _setLocalReportReplyLikes(likes);
  return !currentlyLiked;
}

function _isLocalReportReplyLiked(replyId: string, userId: string): boolean {
  const likes = _getLocalReportReplyLikes();
  return !!likes[userId]?.[replyId];
}

async function _isReportCommentReply(replyId: string): Promise<boolean> {
  if (_reportReplyTypeCache.has(replyId)) {
    return _reportReplyTypeCache.get(replyId)!;
  }
  try {
    const { data, error } = await supabase
      .from('report_comment_replies')
      .select('id')
      .eq('id', replyId)
      .maybeSingle();
    if (error && (error as any)?.code && (error as any).code !== 'PGRST116') {
      console.warn('Error checking reply system type:', error);
    }
    const isReportReply = !!data;
    _reportReplyTypeCache.set(replyId, isReportReply);
    return isReportReply;
  } catch (err) {
    console.warn('Unexpected error checking reply system type:', err);
    _reportReplyTypeCache.set(replyId, false);
    return false;
  }
}

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

// Helper function to transform location JSON object to location_lat/location_lng
// Database stores location as {lat, lng} JSON, but TypeScript interface expects location_lat/location_lng
function _transformLocationData(report: any): any {
  // If location_lat and location_lng already exist, use them
  if (report.location_lat !== undefined && report.location_lng !== undefined) {
    return report;
  }
  
  // Otherwise, extract from location JSON object
  if (report.location && typeof report.location === 'object') {
    return {
      ...report,
      location_lat: report.location.lat ?? null,
      location_lng: report.location.lng ?? null,
    };
  }
  
  // If no location data at all, return as-is (will be null/undefined)
  return report;
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
    const user = getCurrentUser();

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
      // If there is no Supabase session, use backend immediately (JWT flow)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !session.user) {
          const url = `${getApiUrl('/api/reports')}`;
          const resp = await authenticatedRequest(url, {
            method: 'POST',
            body: JSON.stringify({
              title: (reportData as any).title,
              description: (reportData as any).description,
              category: (reportData as any).category,
              priority: (reportData as any).priority,
              priority_level: (reportData as any).priority_level,
              location_lat: (reportData as any).location_lat,
              location_lng: (reportData as any).location_lng,
              location_address: (reportData as any).location_address,
              images: (reportData as any).images,
              is_anonymous: (reportData as any).is_anonymous || false,
              assigned_group: (reportData as any).assigned_group,
              can_cancel: (reportData as any).can_cancel
            })
          });
          if (!resp.ok) {
            const body = await resp.text().catch(() => '');
            throw new ReportsServiceError(`Failed to create report (api): HTTP ${resp.status} ${body}`);
          }
          const data = await resp.json();
          return {
            ...data,
            likes: { count: 0 },
            comments: { count: 0 }
          } as any;
        }
      } catch (prefetchErr) {
        // proceed to client insert path
      }
      // Helper: derive priority_level from priority when not explicitly set
      const deriveLevelFromPriority = (priority?: Report['priority']): number | null => {
        switch (priority) {
          case 'high': return 5;
          case 'medium': return 3;
          case 'low': return 1;
          default: return null;
        }
      };
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
        is_anonymous: (reportData as any).is_anonymous || false, // Anonymous reporting flag
        // Ticketing system fields
        // Auto-derive from priority when not provided
        priority_level: (reportData as any).priority_level ?? deriveLevelFromPriority((reportData as any).priority),
        assigned_group: (reportData as any).assigned_group || null,
        can_cancel: (reportData as any).can_cancel !== false, // Default to true
        // idempotency_key intentionally omitted: column not present in schema
      };

      const { data, error } = await supabase
        .from('reports')
        .insert([payload])
        .select('id, user_id, title, description, category, priority, status, location, location_address, images, is_anonymous, created_at, updated_at, case_number, priority_level, assigned_group, assigned_patroller_name, can_cancel')
        .single();

      if (error) {
        // Fallback to server endpoint if RLS/401 prevents insert
        const message = (error as any)?.message || '';
        if (message.includes('row-level security') || (error as any)?.code === '42501' || (error as any)?.status === 401) {
          try {
            const url = `${getApiUrl('/api/reports')}`;
            const resp = await authenticatedRequest(url, {
              method: 'POST',
              body: JSON.stringify({
                title: payload.title,
                description: payload.description,
                category: payload.category,
                priority: payload.priority,
                priority_level: payload.priority_level,
                location_lat: payload.location?.lat,
                location_lng: payload.location?.lng,
                location_address: payload.location_address,
                images: payload.images,
                is_anonymous: payload.is_anonymous,
                assigned_group: payload.assigned_group,
                can_cancel: payload.can_cancel
              })
            });
            if (!resp.ok) {
              const body = await resp.text().catch(() => '');
              throw new ReportsServiceError(`Failed to create report (api): HTTP ${resp.status} ${body}`);
            }
            const apiData = await resp.json();
            // Cache the user profile for future use
            if (apiData.user_id) {
              _cacheProfile(apiData.user_id, optimisticReport.user_profile!);
            }
            return {
              ...apiData,
              likes: { count: 0 },
              comments: { count: 0 }
            } as any;
          } catch (apiErr: any) {
            const msg = apiErr?.message || message || 'Unknown error';
            throw new ReportsServiceError(`Failed to create report: ${msg}`);
          }
        }
        throw error;
      }

      // Cache the user profile for future use
      if (data.user_id) {
        _cacheProfile(data.user_id, optimisticReport.user_profile!);
      }

      // Create notification asynchronously (guarded by feature flag)
      if (ENABLE_CLIENT_SIDE_NOTIFICATIONS) {
        try {
          await supabase.from('notifications').insert({
            user_id: payload.user_id,
            title: 'Case Received',
            message: `We received your case: "${payload.title}". We'll review it shortly.`,
            type: 'info',
            link: `/reports/${data.id}`,
            read: false,
          } as any);
        } catch (e) {
          console.warn('Client-side notification insert failed:', e);
        }
      }

      // Check for achievements asynchronously
      try {
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
      // Validate commentId to prevent undefined query errors
      if (!commentId || commentId === undefined || commentId === null) {
        console.warn('getCommentReplies called with invalid commentId:', commentId);
        return [];
      }
      // Check if this is a report comment or regular comment
      const { data: reportComment, error: reportCommentError } = await supabase
        .from('report_comments')
        .select('id')
        .eq('id', commentId)
        .maybeSingle();

      if (reportCommentError) {
        throw reportCommentError;
      }

      let rootReplies: any[] = [];
      
      if (reportComment) {
        // This is a report comment, fetch from report_comment_replies table
        const { data, error } = await supabase
          .from('report_comment_replies')
          .select('*')
          .eq('comment_id', commentId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        rootReplies = data || [];
      } else {
        // This is a regular comment, fetch from comment_replies table
        const { data, error } = await supabase
          .from('comment_replies')
          .select('*')
          .eq('parent_comment_id', commentId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        rootReplies = data || [];
      }

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
        const user = getCurrentUser();

        // For each reply, get likes count, is_liked, and nested replies if depth allows
        const result: CommentReply[] = [];
        for (const r of replies) {
          const [likesResult, userLikedData] = await Promise.all([
            supabase.from('reply_likes').select('*', { count: 'exact', head: true }).eq('reply_id', r.id),
            user ? supabase.from('reply_likes').select('id').eq('reply_id', r.id).eq('user_id', user.id) : Promise.resolve({ data: null })
          ] as any);

          const likesCount = likesResult?.count || 0;
          const isReportReply = Object.prototype.hasOwnProperty.call(r, 'reply_text') && r.reply_text !== undefined;
          const localLiked = isReportReply ? _isLocalReportReplyLiked(r.id, user.id) : !!(userLikedData && userLikedData.data && userLikedData.data.length > 0);
          const effectiveLikesCount = likesCount + (isReportReply && localLiked ? 1 : 0);

          let nested: CommentReply[] | undefined = undefined;
          if (depth < maxDepth) {
            // For nested replies, check both tables
            const [legacyChildReplies, reportChildReplies] = await Promise.all([
              supabase.from('comment_replies').select('*').eq('parent_reply_id', r.id).order('created_at', { ascending: true }),
              supabase.from('report_comment_replies').select('*').eq('parent_reply_id', r.id).order('created_at', { ascending: true })
            ]);
            
            const childReplies = [...(legacyChildReplies.data || []), ...(reportChildReplies.data || [])];
            if (childReplies.length > 0) {
              nested = await hydrateReplies(childReplies, depth + 1);
            }
          }

          const profile = _getCachedProfile(r.user_id) || { username: 'User', avatar_url: null };
          result.push({
            id: r.id,
            parent_comment_id: r.parent_comment_id || r.comment_id || undefined,
            parent_reply_id: r.parent_reply_id || undefined,
            user_id: r.user_id,
            content: r.content || r.reply_text,
            created_at: r.created_at,
            updated_at: r.updated_at,
            user: { username: profile.username, avatar_url: profile.avatar_url },
            replies: nested,
            reply_depth: depth,
            likes_count: effectiveLikesCount || 0,
            is_liked: localLiked,
            is_report_reply: isReportReply
          } as CommentReply);
        }

        return result;
      };

      // Process all replies from database
      const dbReplies = await hydrateReplies(rootReplies, 0);
      return dbReplies;
    } catch (error) {
      throw new ReportsServiceError(`Failed to get comment replies: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Add a comment reply (top-level to comment or nested to reply)
  async addCommentReply(parentId: string, content: string, isNested: boolean = false): Promise<CommentReply> {
    try {
      const user = getCurrentUser();
      if (!user) throw new ReportsServiceError('User not authenticated');

      // Check if this is a mock ID (report comment simulation)
      const isMockId = parentId.startsWith('mock-');
      
      // If it's a mock ID, skip database check and use localStorage
      if (isMockId) {
        const profile = _getCachedProfile(user.id) || (() => ({ username: user.email?.split('@')[0] || 'User', avatar_url: null }))();

        const newReply: CommentReply = {
          id: `mock-${Date.now()}`,
          parent_comment_id: isNested ? undefined : parentId,
          parent_reply_id: isNested ? parentId : undefined,
          user_id: user.id,
          content: content,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user: { username: profile.username, avatar_url: profile.avatar_url },
          replies: [],
          reply_depth: isNested ? 1 : 0,
          likes_count: 0,
          is_liked: false,
        } as CommentReply;

        const repliesKey = 'report_comment_replies';
        const stored = JSON.parse(localStorage.getItem(repliesKey) || '{}');
        
        if (!isNested) {
          // Top-level reply - store directly under the comment ID
          if (!Array.isArray(stored[parentId])) {
            stored[parentId] = [];
          }
          stored[parentId].push(newReply);
        } else {
          // Nested reply - find the comment and add to the appropriate reply's replies array
          let foundInComment = false;
          
          // Helper function to add nested reply recursively
          const addNestedReplyToTree = (replies: any[]): boolean => {
            for (let i = 0; i < replies.length; i++) {
              if (replies[i].id === parentId) {
                if (!Array.isArray(replies[i].replies)) {
                  replies[i].replies = [];
                }
                replies[i].replies.push(newReply);
                return true;
              }
              if (replies[i].replies && Array.isArray(replies[i].replies)) {
                if (addNestedReplyToTree(replies[i].replies)) {
                  return true;
                }
              }
            }
            return false;
          };
          
          // Search through all comments to find where this reply belongs
          for (const replies of Object.values(stored)) {
            if (Array.isArray(replies)) {
              if (addNestedReplyToTree(replies)) {
                foundInComment = true;
                break;
              }
            }
          }
          
          // If we couldn't find the parent reply, create a new entry
          if (!foundInComment) {
            console.warn('Could not find parent reply in storage, creating new entry');
            if (!Array.isArray(stored[parentId])) {
              stored[parentId] = [];
            }
            stored[parentId].push(newReply);
          }
        }
        
        localStorage.setItem(repliesKey, JSON.stringify(stored));
        
        return newReply;
      }

      // Try Supabase session first
      const getUserRes = await supabase.auth.getUser();
      let supabaseUser = getUserRes.data.user as any;
      const hasSupabaseSession = !!supabaseUser;
      
      // Fallback to app auth store if Supabase session is missing
      if (!supabaseUser) {
        try {
          const storeUser = getCurrentUser();
          supabaseUser = { id: storeUser.id } as any;
        } catch (e) {
          throw new ReportsServiceError('User not authenticated');
        }
      }

      // Check if this is a report comment or report reply
      let isReportComment = false;
      let actualCommentId = parentId;
      
      if (isNested) {
        // For nested replies, we need to find the parent comment
        // Check if parentId is a report comment reply
        const { data: reportReply, error: reportReplyError } = await supabase
          .from('report_comment_replies')
          .select('comment_id')
          .eq('id', parentId)
          .maybeSingle();
        
        if (reportReplyError) {
          console.warn('Error checking report comment reply:', reportReplyError);
        }
        
        if (reportReply) {
          isReportComment = true;
          actualCommentId = reportReply.comment_id;
        } else {
          // Check if it's a regular comment reply
          const { data: regularReply, error: regularReplyError } = await supabase
            .from('comment_replies')
            .select('parent_comment_id')
            .eq('id', parentId)
            .maybeSingle();
          
          if (regularReplyError) {
            console.warn('Error checking legacy comment reply:', regularReplyError);
          }
          
          if (regularReply) {
            actualCommentId = regularReply.parent_comment_id;
          }
        }
      } else {
        // For direct replies, check if parentId is a report comment
        const { data: reportComment, error: reportCommentError } = await supabase
          .from('report_comments')
          .select('id')
          .eq('id', parentId)
          .maybeSingle();
        
        if (reportCommentError) {
          console.warn('Error checking report comment:', reportCommentError);
        }

        if (reportComment) {
          isReportComment = true;
        }
      }

      let data: any;
      
      if (!isReportComment) {
        // If it's not a report comment, use the old system
        const payload: any = {
          user_id: user.id,
          content,
          parent_comment_id: isNested ? null : parentId,
          parent_reply_id: isNested ? parentId : null,
        };

        // Try direct insert first only if we have a Supabase session
        if (hasSupabaseSession) {
          try {
            const insertRes = await supabase
              .from('comment_replies')
              .insert([payload])
              .select()
              .single();
            if (insertRes.error) throw insertRes.error;
            data = insertRes.data;
          } catch (clientErr: any) {
            // Fall through to server endpoint
            console.warn('Direct Supabase insert failed, falling back to server:', clientErr.message);
          }
        }

        if (!data) {
          // Use server endpoint with service role
          const res = await fetch(getApiUrl(`/api/comments/${actualCommentId}/replies`), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, content, isNested })
          });
          if (!res.ok) {
            const errText = await res.text();
            throw new ReportsServiceError(errText || 'Failed to add reply');
          }
          data = await res.json();
        }

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

      // For report comments, try direct insert first if we have a Supabase session
      if (hasSupabaseSession) {
        try {
          const payload: any = {
            user_id: user.id,
            reply_text: content,
            comment_id: isNested ? actualCommentId : parentId,
            parent_reply_id: isNested ? parentId : null,
          };

          const insertRes = await supabase
            .from('report_comment_replies')
            .insert([payload])
            .select()
            .single();
          if (insertRes.error) throw insertRes.error;
          data = insertRes.data;
        } catch (clientErr: any) {
          // Fall through to server endpoint
          console.warn('Direct Supabase insert failed, falling back to server:', clientErr.message);
        }
      }

      if (!data) {
        // Use server endpoint with service role
        const res = await fetch(getApiUrl(`/api/reports/${actualCommentId}/replies`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: user.id, 
            content, 
            isNested,
            parentReplyId: isNested ? parentId : undefined
          })
        });
        if (!res.ok) {
          const errText = await res.text();
          throw new ReportsServiceError(errText || 'Failed to add reply');
        }
        data = await res.json();
      }

      const profile = _getCachedProfile(user.id) || (() => ({ username: user.email?.split('@')[0] || 'User', avatar_url: null }))();

      const newReply: CommentReply = {
        id: data.id,
        parent_comment_id: data.comment_id || data.parent_comment_id || undefined,
        parent_reply_id: data.parent_reply_id || undefined,
        user_id: user.id,
        content: data.reply_text || data.content,
        created_at: data.created_at,
        updated_at: data.updated_at,
        user: { username: profile.username, avatar_url: profile.avatar_url },
        replies: [],
        reply_depth: isNested ? 1 : 0,
        likes_count: 0,
        is_liked: false,
      } as CommentReply;

      return newReply;
    } catch (error) {
      throw new ReportsServiceError(`Failed to add reply: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Toggle like for a comment
  async toggleCommentLike(commentId: string): Promise<boolean> {
    const user = getCurrentUser();

    // Check if this is a report comment or regular comment
    const { data: reportComment, error: reportCommentError } = await supabase
      .from('report_comments')
      .select('id')
      .eq('id', commentId)
      .maybeSingle();

    if (reportCommentError) {
      throw new ReportsServiceError(reportCommentError.message);
    }

    if (!reportComment) {
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
    const user = getCurrentUser();

    // For simulated replies (created for report comments), we use localStorage
    // since they are not persisted to the `comment_replies` table and thus
    // cannot be referenced by `reply_likes` without violating FKs.
    if (replyId.startsWith('mock-')) {
      return _toggleLocalReportReplyLike(replyId, user.id);
    }

    // Replies from the new report comment replies system currently do not support
    // server-side likes, so we gracefully fall back to local storage for now.
    if (await _isReportCommentReply(replyId)) {
      return _toggleLocalReportReplyLike(replyId, user.id);
    }

    // If there's no Supabase session (e.g. user logged in via JWT), use server endpoint
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
        const url = `${getApiUrl(`/api/replies/${replyId}/likes/toggle`)}`;
        const resp = await authenticatedRequest(url, { method: 'POST' });
        if (!resp.ok) {
          const body = await resp.text().catch(() => '');
          if (resp.status === 422 && body && body.includes('Reply belongs to the newer report replies system')) {
            _reportReplyTypeCache.set(replyId, true);
            return _toggleLocalReportReplyLike(replyId, user.id);
          }
          throw new ReportsServiceError(`Failed to toggle reply like (api): HTTP ${resp.status} ${body}`);
        }
        const json = await resp.json().catch(() => ({} as any));
        return !!json.liked;
      }
    } catch (prefetchErr) {
      // If session check fails, proceed to attempt direct Supabase action below
    }

    // Attempt direct Supabase action (when user has a Supabase session)
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
      if (error) {
        // If RLS blocks client insert, fallback to server toggle endpoint
        const message = (error as any)?.message || '';
        const code = String((error as any)?.code || '');
        if (code === '23503' || message.includes('Reply belongs to the newer report replies system')) {
          _reportReplyTypeCache.set(replyId, true);
          return _toggleLocalReportReplyLike(replyId, user.id);
        }
        if (message.includes('row-level security') || (error as any)?.status === 401) {
          try {
            const url = `${getApiUrl(`/api/replies/${replyId}/likes/toggle`)}`;
            const resp = await authenticatedRequest(url, { method: 'POST' });
            if (!resp.ok) {
              const body = await resp.text().catch(() => '');
              if (resp.status === 422 && body && body.includes('Reply belongs to the newer report replies system')) {
                _reportReplyTypeCache.set(replyId, true);
                return _toggleLocalReportReplyLike(replyId, user.id);
              }
              throw new ReportsServiceError(`Failed to toggle reply like (api): HTTP ${resp.status} ${body}`);
            }
            const json = await resp.json().catch(() => ({} as any));
            return !!json.liked;
          } catch (apiErr: any) {
            throw new ReportsServiceError(`Failed to like reply: ${apiErr?.message || message}`);
          }
        }
        throw new ReportsServiceError(`Failed to like reply: ${error.message}`);
      }
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
      const buildLocalLikeDetails = async (): Promise<LikeDetail[]> => {
        const allLikes = _getLocalReportReplyLikes();
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
            id: `local-${userId}-${replyId}`,
            user_id: userId,
            reply_id: replyId,
            created_at: new Date().toISOString(),
            user: { username: profile.username, avatar_url: profile.avatar_url }
          } as LikeDetail;
        });
      };

      // Handle simulated replies (mock IDs) and report comment replies via local storage
      if (replyId.startsWith('mock-')) {
        return await buildLocalLikeDetails();
      }

      if (await _isReportCommentReply(replyId)) {
        return await buildLocalLikeDetails();
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

  // Get reports for admin dashboard sorted by case number
  async getAdminReports(filters?: {
    category?: string;
    status?: string;
    priority?: string;
    search?: string;
    limit?: number;
  }): Promise<Report[]> {
    try {
      // Create cache key based on filters
      const cacheKey = JSON.stringify({ ...filters, admin: true });
      const cacheKeyHash = btoa(cacheKey).slice(0, 20);
      
      // Check memory cache first
      const cached = sessionStorage.getItem(`admin_reports_${cacheKeyHash}`);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < 30000) { // 30 second cache
          return data;
        }
      }

      let query = supabase
        .from('reports')
        .select('*')
        .order('case_number', { ascending: true });
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
        
        // Handle "declined" filter - match both "declined" and "rejected" for backward compatibility
        if (normalizedStatus === 'declined') {
          query = query.in('status', ['declined', 'rejected']);
        } else {
          query = query.eq('status', normalizedStatus);
        }
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
      
      // Get current user from auth store
      let user;
      try {
        user = getCurrentUser();
      } catch (error) {
        console.error('Error getting user:', error);
        // If user is not authenticated, we can still fetch reports but without user-specific data
        user = null;
      }
      
      // Use cached profiles where possible
      const uncachedUserIds = userIds.filter(id => !_getCachedProfile(id));
      
      const [profilesData, userLikes] = await Promise.all([
        uncachedUserIds.length > 0 ? supabase
          .from('profiles')
          .select('id, username, first_name, avatar_url')
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

      // Fetch additional data for each report
      const reportIds = reportsData.map(report => report.id);
      
      // Fetch likes, comments, and ratings data in parallel
      const [likesData, commentsData, reportCommentsData, ratingsData] = await Promise.all([
        supabase.from('likes').select('report_id').in('report_id', reportIds),
        supabase.from('comments').select('report_id').in('report_id', reportIds),
        supabase.from('report_comments').select('report_id').in('report_id', reportIds),
        supabase.from('report_ratings').select('report_id, stars').in('report_id', reportIds)
      ]);

      // Create lookup maps for counts
      const likesCountMap = new Map();
      const commentsCountMap = new Map();
      const reportCommentsCountMap = new Map();
      const replyCountMap = new Map();
      const ratingsMap = new Map();

      // Process likes
      if (likesData.data) {
        likesData.data.forEach(like => {
          const count = likesCountMap.get(like.report_id) || 0;
          likesCountMap.set(like.report_id, count + 1);
        });
      }

      // Process comments
      if (commentsData.data) {
        commentsData.data.forEach(comment => {
          const count = commentsCountMap.get(comment.report_id) || 0;
          commentsCountMap.set(comment.report_id, count + 1);
        });
      }

      // Process report comments
      if (reportCommentsData.data) {
        reportCommentsData.data.forEach(comment => {
          const count = reportCommentsCountMap.get(comment.report_id) || 0;
          reportCommentsCountMap.set(comment.report_id, count + 1);
        });
      }

      // Process replies - need to get comment IDs first, then count replies
      const commentIds = [...new Set([
        ...(commentsData.data?.map(c => c.id) || []),
        ...(reportCommentsData.data?.map(c => c.id) || [])
      ])].filter(id => id && id !== undefined && id !== null);

      if (commentIds.length > 0) {
        // Fetch replies for both comment systems
        const [legacyRepliesData, reportCommentRepliesData] = await Promise.all([
          supabase.from('comment_replies').select('parent_comment_id').in('parent_comment_id', commentIds),
          supabase.from('report_comment_replies').select('comment_id').in('comment_id', commentIds)
        ]);

        // Count legacy comment replies
        if (legacyRepliesData.data) {
          legacyRepliesData.data.forEach(reply => {
            // Find which report this comment belongs to
            const comment = commentsData.data?.find(c => c.id === reply.parent_comment_id);
            if (comment) {
              const count = replyCountMap.get(comment.report_id) || 0;
              replyCountMap.set(comment.report_id, count + 1);
            }
          });
        }

        // Count report comment replies
        if (reportCommentRepliesData.data) {
          reportCommentRepliesData.data.forEach(reply => {
            // Find which report this comment belongs to
            const comment = reportCommentsData.data?.find(c => c.id === reply.comment_id);
            if (comment) {
              const count = replyCountMap.get(comment.report_id) || 0;
              replyCountMap.set(comment.report_id, count + 1);
            }
          });
        }
      }

      // Process ratings
      if (ratingsData.data) {
        const ratingsByReport = new Map();
        ratingsData.data.forEach(rating => {
          if (!ratingsByReport.has(rating.report_id)) {
            ratingsByReport.set(rating.report_id, []);
          }
          ratingsByReport.get(rating.report_id).push(rating.stars);
        });

        ratingsByReport.forEach((stars, reportId) => {
          const avg = stars.reduce((sum, star) => sum + star, 0) / stars.length;
          ratingsMap.set(reportId, {
            avg: Math.round(avg * 10) / 10,
            count: stars.length
          });
        });
      }

      // Combine data efficiently
      const result = reportsData.map(report => {
        const transformed = _transformLocationData(report);
        return {
          ...transformed,
          user_profile: profilesMap.get(report.user_id),
          is_liked: likedReportIds.has(report.id),
          likes: { count: likesCountMap.get(report.id) || 0 },
          // Normalize comment count: sum legacy `comments`, new `report_comments`, and replies
          comments: { 
            count: (commentsCountMap.get(report.id) || 0) + 
                   (reportCommentsCountMap.get(report.id) || 0) + 
                   (replyCountMap.get(report.id) || 0) 
          },
          rating_avg: ratingsMap.get(report.id)?.avg,
          rating_count: ratingsMap.get(report.id)?.count || 0
        };
      });

      // Cache the result
      sessionStorage.setItem(`admin_reports_${cacheKeyHash}`, JSON.stringify({
        data: result,
        timestamp: Date.now()
      }));

      return result;
    } catch (error) {
      throw new ReportsServiceError(`Failed to get admin reports: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Get reports with optimized queries and caching
  async getReports(filters?: {
    category?: string;
    status?: string;
    priority?: string;
    search?: string;
    limit?: number;
    user_id?: string; // Add user_id filter for user-specific reports
  }): Promise<Report[]> {
    try {
      // Create stable cache key based on explicit filter parts to avoid collisions
      const cacheKeyHash = [
        `status=${String(filters?.status ?? 'All')}`,
        `category=${String(filters?.category ?? 'All')}`,
        `priority=${String(filters?.priority ?? 'All')}`,
        `search=${String(filters?.search ?? '')}`,
        `limit=${String((filters?.limit as any) ?? '')}`,
        `user_id=${String(filters?.user_id ?? 'All')}`
      ].join('|');
      
      // Check session cache first
      const cached = sessionStorage.getItem(`reports_cache_${cacheKeyHash}`);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < 30000) { // 30 second cache
          return data;
        }
      }

      let query = supabase
        .from('reports')
        .select('*')
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
        
        // Handle "Declined" filter - match both "declined" and "rejected" for backward compatibility
        if (normalizedStatus === 'declined') {
          query = query.in('status', ['declined', 'rejected']);
        } else {
          query = query.eq('status', normalizedStatus);
        }
      } else {
        // Exclude verifying and declined reports when no specific status filter is applied
        // Note: cancelled reports are now included in verification reports page
        // Also exclude "rejected" for backward compatibility
        query = query.neq('status', 'verifying').neq('status', 'declined').neq('status', 'rejected');
      }
      if (filters?.priority && filters.priority !== 'All') {
        query = (query as any).ilike('priority', filters.priority.toLowerCase());
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      if (filters?.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      const { data: reportsData, error: reportsError } = await query;
      if (reportsError) throw reportsError;

      if (!reportsData || reportsData.length === 0) {
        return [];
      }

      // Batch fetch user profiles and user likes in parallel with caching
      const userIds = [...new Set(reportsData.map(report => report.user_id))];
      
      // Get current user from auth store
      let user;
      try {
        user = getCurrentUser();
      } catch (error) {
        console.error('Error getting user:', error);
        // If user is not authenticated, we can still fetch reports but without user-specific data
        user = null;
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

      // Fetch additional data for each report
      const reportIds = reportsData.map(report => report.id);
      
      // Fetch likes, comments, and ratings data in parallel
      const [likesData, commentsData, reportCommentsData, ratingsData] = await Promise.all([
        supabase.from('likes').select('report_id').in('report_id', reportIds),
        supabase.from('comments').select('report_id').in('report_id', reportIds),
        supabase.from('report_comments').select('report_id').in('report_id', reportIds),
        supabase.from('report_ratings').select('report_id, stars').in('report_id', reportIds)
      ]);

      // Create lookup maps for counts
      const likesCountMap = new Map();
      const commentsCountMap = new Map();
      const reportCommentsCountMap = new Map();
      const replyCountMap = new Map();
      const ratingsMap = new Map();

      // Process likes
      if (likesData.data) {
        likesData.data.forEach(like => {
          const count = likesCountMap.get(like.report_id) || 0;
          likesCountMap.set(like.report_id, count + 1);
        });
      }

      // Process comments
      if (commentsData.data) {
        commentsData.data.forEach(comment => {
          const count = commentsCountMap.get(comment.report_id) || 0;
          commentsCountMap.set(comment.report_id, count + 1);
        });
      }

      // Process report comments
      if (reportCommentsData.data) {
        reportCommentsData.data.forEach(comment => {
          const count = reportCommentsCountMap.get(comment.report_id) || 0;
          reportCommentsCountMap.set(comment.report_id, count + 1);
        });
      }

      // Process replies - need to get comment IDs first, then count replies
      const commentIds = [...new Set([
        ...(commentsData.data?.map(c => c.id) || []),
        ...(reportCommentsData.data?.map(c => c.id) || [])
      ])].filter(id => id && id !== undefined && id !== null);

      if (commentIds.length > 0) {
        // Fetch replies for both comment systems
        const [legacyRepliesData, reportCommentRepliesData] = await Promise.all([
          supabase.from('comment_replies').select('parent_comment_id').in('parent_comment_id', commentIds),
          supabase.from('report_comment_replies').select('comment_id').in('comment_id', commentIds)
        ]);

        // Count legacy comment replies
        if (legacyRepliesData.data) {
          legacyRepliesData.data.forEach(reply => {
            // Find which report this comment belongs to
            const comment = commentsData.data?.find(c => c.id === reply.parent_comment_id);
            if (comment) {
              const count = replyCountMap.get(comment.report_id) || 0;
              replyCountMap.set(comment.report_id, count + 1);
            }
          });
        }

        // Count report comment replies
        if (reportCommentRepliesData.data) {
          reportCommentRepliesData.data.forEach(reply => {
            // Find which report this comment belongs to
            const comment = reportCommentsData.data?.find(c => c.id === reply.comment_id);
            if (comment) {
              const count = replyCountMap.get(comment.report_id) || 0;
              replyCountMap.set(comment.report_id, count + 1);
            }
          });
        }
      }

      // Process ratings
      if (ratingsData.data) {
        const ratingsByReport = new Map();
        ratingsData.data.forEach(rating => {
          if (!ratingsByReport.has(rating.report_id)) {
            ratingsByReport.set(rating.report_id, []);
          }
          ratingsByReport.get(rating.report_id).push(rating.stars);
        });

        ratingsByReport.forEach((stars, reportId) => {
          const avg = stars.reduce((sum, star) => sum + star, 0) / stars.length;
          ratingsMap.set(reportId, {
            avg: Math.round(avg * 10) / 10,
            count: stars.length
          });
        });
      }

      // Combine data efficiently
      const result = reportsData.map(report => {
        const transformed = _transformLocationData(report);
        return {
          ...transformed,
          user_profile: profilesMap.get(report.user_id),
          is_liked: likedReportIds.has(report.id),
          likes: { count: likesCountMap.get(report.id) || 0 },
          // Normalize comment count: sum legacy `comments`, new `report_comments`, and replies
          comments: { 
            count: (commentsCountMap.get(report.id) || 0) + 
                   (reportCommentsCountMap.get(report.id) || 0) + 
                   (replyCountMap.get(report.id) || 0) 
          },
          rating_avg: ratingsMap.get(report.id)?.avg,
          rating_count: ratingsMap.get(report.id)?.count || 0
        };
      });

      // Cache the result with the new namespace to prevent key collisions across pages
      sessionStorage.setItem(`reports_cache_${cacheKeyHash}`, JSON.stringify({
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
    const user = getCurrentUser();

    // Validate status
    const validStatuses = ['verifying', 'pending', 'in_progress', 'resolved', 'declined', 'cancelled'] as const;
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
            title: 'Case Updated',
            message: `Your case "${reportOwner.title}" is now ${formatStatusForDisplay(newStatus)}.`,
            type: newStatus === 'resolved' ? 'success' : ((newStatus === 'declined' || newStatus === 'rejected') ? 'warning' : 'info'),
            link: `/reports/${reportId}`,
            read: false,
          } as any);
        }
      } catch (e) {
        console.warn('Client-side notification insert failed:', e);
      }
    }

    return data;
  },

  // Like/unlike report with optimistic updates
  async toggleLike(reportId: string): Promise<boolean> {
    const user = getCurrentUser();
    
    // If there is no Supabase session, use backend immediately (JWT flow)
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
        const url = `${getApiUrl(`/api/reports/${reportId}/likes/toggle`)}`;
        const resp = await authenticatedRequest(url, { method: 'POST' });
        if (!resp.ok) {
          const body = await resp.text().catch(() => '');
          throw new ReportsServiceError(`Failed to toggle like (api): HTTP ${resp.status} ${body}`);
        }
        const json = await resp.json().catch(() => ({} as any));
        return !!json.liked;
      }
    } catch (prefetchErr) {
      // If session check fails, proceed to fallback path below
    }

    // First try via Supabase session (works when user signed in with Supabase)
    try {
      const { data: existingLikes, error: checkError } = await supabase
        .from('likes')
        .select('id')
        .eq('report_id', reportId)
        .eq('user_id', user.id);

      if (checkError) throw checkError;

      const existingLike = existingLikes && existingLikes.length > 0 ? existingLikes[0] : null;

      if (existingLike) {
        const { error: deleteError } = await supabase
          .from('likes')
          .delete()
          .eq('id', existingLike.id);

        if (deleteError) throw deleteError;
        return false;
      } else {
        const { error: insertError } = await supabase
          .from('likes')
          .insert([{ report_id: reportId, user_id: user.id }]);

        if (insertError) throw insertError;
        return true;
      }
    } catch (sessionError) {
      // If 401 or RLS due to no Supabase session, fallback to backend with JWT
      try {
        const url = `${getApiUrl(`/api/reports/${reportId}/likes/toggle`)}`;
        const resp = await authenticatedRequest(url, { method: 'POST' });
        if (!resp.ok) {
          // If toggle endpoint not found (older server), fallback to explicit POST/DELETE endpoints
          if (resp.status === 404) {
            try {
              // Determine current like state via public SELECT (allowed by RLS)
              const { data: existingLikes } = await supabase
                .from('likes')
                .select('id')
                .eq('report_id', reportId)
                .eq('user_id', user.id);
              const isAlreadyLiked = !!(existingLikes && existingLikes.length > 0);

              const explicitUrl = `${getApiUrl(`/api/reports/${reportId}/likes`)}`;
              const method = isAlreadyLiked ? 'DELETE' : 'POST';
              const explicitResp = await authenticatedRequest(explicitUrl, { method });
              if (!explicitResp.ok) {
                const body = await explicitResp.text().catch(() => '');
                throw new ReportsServiceError(`Failed to toggle like (api v1): HTTP ${explicitResp.status} ${body}`);
              }
              return !isAlreadyLiked;
            } catch (fallbackErr: any) {
              const msg = fallbackErr?.message || 'Unknown error';
              throw new ReportsServiceError(`Failed to toggle like (fallback): ${msg}`);
            }
          } else {
            const body = await resp.text().catch(() => '');
            throw new ReportsServiceError(`Failed to toggle like (api): HTTP ${resp.status} ${body}`);
          }
        }
        const json = await resp.json().catch(() => ({} as any));
        return !!json.liked;
      } catch (apiError: any) {
        const msg = apiError?.message || (sessionError as any)?.message || 'Unknown error';
        throw new ReportsServiceError(`Failed to toggle like: ${msg}`);
      }
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
              .select('id, username, first_name, avatar_url')
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
          // Get main comments first
          const [{ count: legacyCount }, { count: newCount }] = await Promise.all([
            supabase.from('comments').select('*', { count: 'exact', head: true }).eq('report_id', reportId).catch(err => {
              console.warn('Error fetching legacy comments count:', err);
              return { count: 0, error: err };
            }),
            supabase.from('report_comments').select('*', { count: 'exact', head: true }).eq('report_id', reportId).catch(err => {
              console.warn('Error fetching report comments count:', err);
              return { count: 0, error: err };
            })
          ] as any);

          // Get comment IDs to find replies
          const [legacyComments, newComments] = await Promise.all([
            supabase.from('comments').select('id').eq('report_id', reportId).catch(err => {
              console.warn('Error fetching legacy comments:', err);
              return { data: [], error: err };
            }),
            supabase.from('report_comments').select('id').eq('report_id', reportId).catch(err => {
              console.warn('Error fetching report comments:', err);
              return { data: [], error: err };
            })
          ]);

          const commentIds = [
            ...(legacyComments.data?.map(c => c.id) || []),
            ...(newComments.data?.map(c => c.id) || [])
          ].filter(id => id && id !== undefined && id !== null);

          let replyCount = 0;
          if (commentIds.length > 0) {
            // Get replies for both comment systems
            const [legacyReplies, newReplies] = await Promise.all([
              supabase.from('comment_replies').select('*', { count: 'exact', head: true }).in('parent_comment_id', commentIds),
              supabase.from('report_comment_replies').select('*', { count: 'exact', head: true }).in('comment_id', commentIds)
            ]);
            replyCount = (legacyReplies.count || 0) + (newReplies.count || 0);
          }

          callback(reportId, (legacyCount || 0) + (newCount || 0) + replyCount);
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
          // Get main comments first
          const [{ count: legacyCount }, { count: newCount }] = await Promise.all([
            supabase.from('comments').select('*', { count: 'exact', head: true }).eq('report_id', reportId).catch(err => {
              console.warn('Error fetching legacy comments count:', err);
              return { count: 0, error: err };
            }),
            supabase.from('report_comments').select('*', { count: 'exact', head: true }).eq('report_id', reportId).catch(err => {
              console.warn('Error fetching report comments count:', err);
              return { count: 0, error: err };
            })
          ] as any);

          // Get comment IDs to find replies
          const [legacyComments, newComments] = await Promise.all([
            supabase.from('comments').select('id').eq('report_id', reportId).catch(err => {
              console.warn('Error fetching legacy comments:', err);
              return { data: [], error: err };
            }),
            supabase.from('report_comments').select('id').eq('report_id', reportId).catch(err => {
              console.warn('Error fetching report comments:', err);
              return { data: [], error: err };
            })
          ]);

          const commentIds = [
            ...(legacyComments.data?.map(c => c.id) || []),
            ...(newComments.data?.map(c => c.id) || [])
          ].filter(id => id && id !== undefined && id !== null);

          let replyCount = 0;
          if (commentIds.length > 0) {
            // Get replies for both comment systems
            const [legacyReplies, newReplies] = await Promise.all([
              supabase.from('comment_replies').select('*', { count: 'exact', head: true }).in('parent_comment_id', commentIds),
              supabase.from('report_comment_replies').select('*', { count: 'exact', head: true }).in('comment_id', commentIds)
            ]);
            replyCount = (legacyReplies.count || 0) + (newReplies.count || 0);
          }

          callback(reportId, (legacyCount || 0) + (newCount || 0) + replyCount);
        } catch (error) {
          console.error('Error in comments subscription (new):', error);
        }
      });
    });

    const unsubscribeReplies = _createSubscription('comment_replies_changes', [
      { event: '*', schema: 'public', table: 'comment_replies' }
    ], async (payload) => {
      // For replies, we need to find which report the parent comment belongs to
      const parentCommentId = payload.new?.parent_comment_id || payload.old?.parent_comment_id;
      if (!parentCommentId) return;
      
      // Find the report ID by looking up the parent comment
      const { data: parentComment } = await supabase
        .from('comments')
        .select('report_id')
        .eq('id', parentCommentId)
        .single();
      
      if (!parentComment) return;
      
      const reportId = parentComment.report_id;
      _debouncedUpdate(`comments_${reportId}`, async () => {
        try {
          // Get main comments first
          const [{ count: legacyCount }, { count: newCount }] = await Promise.all([
            supabase.from('comments').select('*', { count: 'exact', head: true }).eq('report_id', reportId).catch(err => {
              console.warn('Error fetching legacy comments count:', err);
              return { count: 0, error: err };
            }),
            supabase.from('report_comments').select('*', { count: 'exact', head: true }).eq('report_id', reportId).catch(err => {
              console.warn('Error fetching report comments count:', err);
              return { count: 0, error: err };
            })
          ] as any);

          // Get comment IDs to find replies
          const [legacyComments, newComments] = await Promise.all([
            supabase.from('comments').select('id').eq('report_id', reportId).catch(err => {
              console.warn('Error fetching legacy comments:', err);
              return { data: [], error: err };
            }),
            supabase.from('report_comments').select('id').eq('report_id', reportId).catch(err => {
              console.warn('Error fetching report comments:', err);
              return { data: [], error: err };
            })
          ]);

          const commentIds = [
            ...(legacyComments.data?.map(c => c.id) || []),
            ...(newComments.data?.map(c => c.id) || [])
          ].filter(id => id && id !== undefined && id !== null);

          let replyCount = 0;
          if (commentIds.length > 0) {
            // Get replies for both comment systems
            const [legacyReplies, newReplies] = await Promise.all([
              supabase.from('comment_replies').select('*', { count: 'exact', head: true }).in('parent_comment_id', commentIds),
              supabase.from('report_comment_replies').select('*', { count: 'exact', head: true }).in('comment_id', commentIds)
            ]);
            replyCount = (legacyReplies.count || 0) + (newReplies.count || 0);
          }

          callback(reportId, (legacyCount || 0) + (newCount || 0) + replyCount);
        } catch (error) {
          console.error('Error in comments subscription (replies):', error);
        }
      });
    });

    const unsubscribeReportCommentReplies = _createSubscription('report_comment_replies_changes', [
      { event: '*', schema: 'public', table: 'report_comment_replies' }
    ], async (payload) => {
      // For report comment replies, we need to find which report the parent comment belongs to
      const commentId = payload.new?.comment_id || payload.old?.comment_id;
      if (!commentId) return;
      
      // Find the report ID by looking up the parent comment
      const { data: parentComment } = await supabase
        .from('report_comments')
        .select('report_id')
        .eq('id', commentId)
        .single();
      
      if (!parentComment) return;
      
      const reportId = parentComment.report_id;
      _debouncedUpdate(`comments_${reportId}`, async () => {
        try {
          // Get main comments first
          const [{ count: legacyCount }, { count: newCount }] = await Promise.all([
            supabase.from('comments').select('*', { count: 'exact', head: true }).eq('report_id', reportId).catch(err => {
              console.warn('Error fetching legacy comments count:', err);
              return { count: 0, error: err };
            }),
            supabase.from('report_comments').select('*', { count: 'exact', head: true }).eq('report_id', reportId).catch(err => {
              console.warn('Error fetching report comments count:', err);
              return { count: 0, error: err };
            })
          ] as any);

          // Get comment IDs to find replies
          const [legacyComments, newComments] = await Promise.all([
            supabase.from('comments').select('id').eq('report_id', reportId).catch(err => {
              console.warn('Error fetching legacy comments:', err);
              return { data: [], error: err };
            }),
            supabase.from('report_comments').select('id').eq('report_id', reportId).catch(err => {
              console.warn('Error fetching report comments:', err);
              return { data: [], error: err };
            })
          ]);

          const commentIds = [
            ...(legacyComments.data?.map(c => c.id) || []),
            ...(newComments.data?.map(c => c.id) || [])
          ].filter(id => id && id !== undefined && id !== null);

          let replyCount = 0;
          if (commentIds.length > 0) {
            // Get replies for both comment systems
            const [legacyReplies, newReplies] = await Promise.all([
              supabase.from('comment_replies').select('*', { count: 'exact', head: true }).in('parent_comment_id', commentIds),
              supabase.from('report_comment_replies').select('*', { count: 'exact', head: true }).in('comment_id', commentIds)
            ]);
            replyCount = (legacyReplies.count || 0) + (newReplies.count || 0);
          }

          callback(reportId, (legacyCount || 0) + (newCount || 0) + replyCount);
        } catch (error) {
          console.error('Error in comments subscription (report comment replies):', error);
        }
      });
    });

    return () => {
      if (typeof unsubscribeLegacy === 'function') unsubscribeLegacy();
      if (typeof unsubscribeNew === 'function') unsubscribeNew();
      if (typeof unsubscribeReplies === 'function') unsubscribeReplies();
      if (typeof unsubscribeReportCommentReplies === 'function') unsubscribeReportCommentReplies();
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

      // Notify report owner about dispatch/assignment change
      if (ENABLE_CLIENT_SIDE_NOTIFICATIONS) {
        try {
          const { data: owner } = await supabase
            .from('reports')
            .select('user_id, title, assigned_group, case_number')
            .eq('id', reportId)
            .single();
          if (owner?.user_id) {
            const group = (updates.assigned_group as string) || data.assigned_group || 'the team';
            await supabase.from('notifications').insert({
              user_id: owner.user_id,
              title: 'Case Dispatched',
              message: `Your case "${owner.title}" has been dispatched to ${group}.`,
              type: 'info',
              link: `/reports/${reportId}`,
              read: false,
            } as any);
          }
        } catch (e) {
          console.warn('Notification insert (dispatch) failed:', e);
        }
      }
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
          status: 'cancelled',
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

      // Clear cache to ensure fresh data on next fetch
      this.clearCache();

      // Add a comment about the cancellation if reason provided
      if (reason) {
        try {
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

  // Delete a report permanently
  async deleteReport(reportId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting report:', error);
      throw error;
    }
  },

  // Get a single report by ID
  async getReport(reportId: string): Promise<Report> {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          likes:likes(count),
          comments:comments(count),
          comment_count:report_comments(count),
          rating_avg:report_ratings(stars),
          rating_count:report_ratings(count)
        `)
        .eq('id', reportId)
        .single();

      if (error) throw error;
      if (!data) throw new ReportsServiceError('Report not found');

      // Get user profile
      const profile = _getCachedProfile(data.user_id);
      if (!profile) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .eq('id', data.user_id)
          .single();
        
        if (!profileError && profileData) {
          _cacheProfile(profileData.id, profileData);
        }
      }

      // Get current user for like status
      let user;
      try {
        user = getCurrentUser();
      } catch (error) {
        user = null;
      }

      let isLiked = false;
      if (user) {
        const { data: userLikes } = await supabase
          .from('likes')
          .select('id')
          .eq('report_id', reportId)
          .eq('user_id', user.id);
        isLiked = !!(userLikes && userLikes.length > 0);
      }

      const result = {
        ...data,
        user_profile: _getCachedProfile(data.user_id) || { username: 'User', avatar_url: null },
        is_liked: isLiked,
        likes: { count: data.likes?.[0]?.count || 0 },
        comments: { count: (data.comments?.[0]?.count || 0) + (data.comment_count?.[0]?.count || 0) },
        rating_avg: (() => {
          const stars = Array.isArray(data.rating_avg) ? data.rating_avg.map((r:any)=>r.stars) : [];
          if (!stars.length) return undefined;
          const sum = stars.reduce((a:number,b:number)=>a+b,0);
          return Math.round((sum / stars.length) * 10) / 10;
        })(),
        rating_count: data.rating_count?.[0]?.count || 0
      };

      return result as Report;
    } catch (error) {
      throw new ReportsServiceError(`Failed to get report: ${error instanceof Error ? error.message : 'Unknown error'}`);
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