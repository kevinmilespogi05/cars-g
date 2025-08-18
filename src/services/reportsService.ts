import { supabase } from '../lib/supabase';
import { Report, LikeDetail, Comment, CommentReply, CommentLike } from '../types';

export class ReportsServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReportsServiceError';
  }
}

// Private state variables (module-level)
let _reportBatch: Array<Omit<Report, 'id' | 'created_at' | 'updated_at' | 'status'>> = [];
let _batchTimer: NodeJS.Timeout | null = null;
const BATCH_DELAY = 100; // 100ms batch delay

// Profile caching for faster report loading
const _profileCache = new Map<string, { username: string; avatar_url: string | null }>();
const _cacheExpiry = new Map<string, number>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function _getCachedProfile(userId: string) {
  const expiry = _cacheExpiry.get(userId);
  if (expiry && Date.now() < expiry) {
    return _profileCache.get(userId);
  }
  // Clear expired cache
  _profileCache.delete(userId);
  _cacheExpiry.delete(userId);
  return null;
}

function _cacheProfile(userId: string, profile: { username: string; avatar_url: string | null }) {
  _profileCache.set(userId, profile);
  _cacheExpiry.set(userId, Date.now() + CACHE_TTL);
}

async function _flushReportBatch() {
  if (_reportBatch.length === 0) return;

  const batch = [..._reportBatch];
  _reportBatch = [];
  _batchTimer = null;

  try {
    // Insert all reports in a single database call
    const { data, error } = await supabase
      .from('reports')
      .insert(batch.map(report => ({
        user_id: report.user_id,
        title: report.title,
        description: report.description,
        category: report.category,
        priority: report.priority,
        location_lat: report.location_lat,
        location_lng: report.location_lng,
        location_address: report.location_address,
        images: report.images || [],
        status: 'pending'
      })))
      .select();

    if (error) {
      console.error('Batch report insert failed:', error);
      // Could implement retry logic here
    }
  } catch (error) {
    console.error('Error in batch report processing:', error);
  }
}

export const reportsService = {
  // Create report with optimistic updates
  async createReport(reportData: Omit<Report, 'id' | 'created_at' | 'updated_at' | 'status'>): Promise<Report> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ReportsServiceError('User not authenticated');

    // Insert report and get the actual database response
    const { data, error } = await supabase
      .from('reports')
      .insert([{
        user_id: reportData.user_id,
        title: reportData.title,
        description: reportData.description,
        category: reportData.category,
        priority: reportData.priority,
        location_lat: reportData.location_lat,
        location_lng: reportData.location_lng,
        location_address: reportData.location_address,
        images: reportData.images || [],
        status: 'pending'
      }])
      .select()
      .single();

    if (error) throw new ReportsServiceError(`Failed to create report: ${error.message}`);
    if (!data) throw new ReportsServiceError('Failed to create report: No data returned');

    // Return the actual database report with proper structure
    return {
      ...data,
      likes: { count: 0 },
      comments: { count: 0 }
    };
  },

  // Get reports with optimized queries
  async getReports(filters?: {
    category?: string;
    status?: string;
    priority?: string;
    search?: string;
  }): Promise<Report[]> {
    try {
      let query = supabase
        .from('reports')
        .select(`
          *,
          likes:likes(count),
          comments:comments(count)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.category && filters.category !== 'All') {
        query = query.eq('category', filters.category.toLowerCase());
      }
      if (filters?.status && filters.status !== 'All') {
        query = query.eq('status', filters.status.toLowerCase().replace(' ', '_'));
      }
      if (filters?.priority && filters.priority !== 'All') {
        query = query.eq('priority', filters.priority.toLowerCase());
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data: reportsData, error: reportsError } = await query;
      if (reportsError) throw reportsError;

      if (!reportsData || reportsData.length === 0) {
        return [];
      }

      // Batch fetch user profiles and user likes in parallel
      const userIds = [...new Set(reportsData.map(report => report.user_id))];
      
      // Get current user with better error handling
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error getting user:', userError);
        // Continue without user likes if there's an auth error
      }
      
      const [profilesData, userLikes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds),
        user ? supabase
          .from('likes')
          .select('report_id')
          .eq('user_id', user.id) : Promise.resolve({ data: null, error: null })
      ]);

      if (profilesData.error) throw profilesData.error;
      if (userLikes.error) {
        console.error('Error fetching user likes:', userLikes.error);
        // Continue with empty likes if there's an error
      }

      // Create lookup maps
      const profilesMap = new Map(profilesData.data?.map(profile => [profile.id, profile]));
      const likedReportIds = new Set(userLikes.data?.map(like => like.report_id) || []);

      // Combine data efficiently and ensure likes count is properly formatted
      return reportsData.map(report => ({
        ...report,
        user_profile: profilesMap.get(report.user_id),
        is_liked: likedReportIds.has(report.id),
        likes: { count: report.likes?.[0]?.count || 0 },
        comments: { count: report.comments?.[0]?.count || 0 }
      }));
    } catch (error) {
      throw new ReportsServiceError(`Failed to get reports: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Update report status with optimistic updates
  async updateReportStatus(reportId: string, newStatus: Report['status']): Promise<Report> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ReportsServiceError('User not authenticated');

    // Validate status
    const validStatuses = ['pending', 'in_progress', 'resolved', 'rejected'] as const;
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

    return data;
  },

  // Like/unlike report with optimistic updates
  async toggleLike(reportId: string): Promise<boolean> {
    console.log('reportsService.toggleLike called for report:', reportId);
    const { data: { user } } = await supabase.auth.getUser();
    console.log('Current user from auth:', user?.id);
    if (!user) throw new ReportsServiceError('User not authenticated');

    // Check if already liked
    console.log('Checking if user already liked report:', reportId);
    const { data: existingLikes, error: checkError } = await supabase
      .from('likes')
      .select('id')
      .eq('report_id', reportId)
      .eq('user_id', user.id);

    console.log('Existing like check result:', existingLikes, 'error:', checkError);
    if (checkError) throw checkError;

    const existingLike = existingLikes && existingLikes.length > 0 ? existingLikes[0] : null;

    if (existingLike) {
      console.log('User already liked, removing like');
      // Unlike
      const { error: deleteError } = await supabase
        .from('likes')
        .delete()
        .eq('id', existingLike.id);

      if (deleteError) throw new ReportsServiceError(`Failed to unlike report: ${deleteError.message}`);
      console.log('Like removed successfully');
      return false;
    } else {
      console.log('User has not liked, adding like');
      // Like
      const { error: insertError } = await supabase
        .from('likes')
        .insert([{
          report_id: reportId,
          user_id: user.id
        }]);

      if (insertError) throw new ReportsServiceError(`Failed to like report: ${insertError.message}`);
      console.log('Like added successfully');
      return true;
    }
  },

  // Real-time subscriptions
  subscribeToReports(callback: (report: Report) => void) {
    const subscription = supabase
      .channel('reports_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reports',
        },
        async (payload) => {
          try {
            // Get user profile for the new report
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('id, username, avatar_url')
              .eq('id', payload.new.user_id)
              .single();

            if (!profileError && profile) {
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
          } catch (error) {
            console.error('Error in report subscription:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reports',
        },
        (payload) => {
          callback({
            ...payload.new,
            likes: { count: 0 },
            comments: { count: 0 },
            is_liked: false
          } as Report);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  },

  // Subscribe to report status changes
  subscribeToReportStatusChanges(callback: (reportId: string, newStatus: string) => void) {
    const subscription = supabase
      .channel('report_status_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reports',
          filter: 'status=neq.pending',
        },
        (payload) => {
          callback(payload.new.id, payload.new.status);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  },

  // Subscribe to likes changes
  subscribeToLikesChanges(callback: (reportId: string, likeCount: number) => void) {
    console.log('Setting up likes subscription');
    const subscription = supabase
      .channel('likes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes',
        },
        async (payload) => {
          console.log('Likes subscription triggered:', payload);
          console.log('Event type:', payload.eventType);
          console.log('New data:', payload.new);
          console.log('Old data:', payload.old);
          
          try {
            if (payload.eventType === 'INSERT') {
              // Get updated like count
              const { count, error } = await supabase
                .from('likes')
                .select('*', { count: 'exact', head: true })
                .eq('report_id', payload.new.report_id);

              if (error) {
                console.error('Error getting like count after INSERT:', error);
                return;
              }

              console.log('Updated like count for report:', payload.new.report_id, 'count:', count);
              callback(payload.new.report_id, count || 0);
            } else if (payload.eventType === 'DELETE') {
              // Get updated like count
              const { count, error } = await supabase
                .from('likes')
                .select('*', { count: 'exact', head: true })
                .eq('report_id', payload.old.report_id);

              if (error) {
                console.error('Error getting like count after DELETE:', error);
                return;
              }

              console.log('Updated like count for report:', payload.old.report_id, 'count:', count);
              callback(payload.old.report_id, count || 0);
            }
          } catch (error) {
            console.error('Error in likes subscription:', error);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up likes subscription');
      subscription.unsubscribe();
    };
  },

  // Subscribe to comments changes
  subscribeToCommentsChanges(callback: (reportId: string, commentCount: number) => void) {
    console.log('Setting up comments subscription');
    const subscription = supabase
      .channel('comments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
        },
        async (payload) => {
          console.log('Comments subscription triggered:', payload);
          try {
            if (payload.eventType === 'INSERT') {
              // Get updated comment count
              const { count } = await supabase
                .from('comments')
                .select('*', { count: 'exact', head: true })
                .eq('report_id', payload.new.report_id);

              console.log('Updated comment count for report:', payload.new.report_id, 'count:', count);
              callback(payload.new.report_id, count || 0);
            } else if (payload.eventType === 'DELETE') {
              // Get updated comment count
              const { count } = await supabase
                .from('comments')
                .select('*', { count: 'exact', head: true })
                .eq('report_id', payload.old.report_id);

              console.log('Updated comment count for report:', payload.old.report_id, 'count:', count);
              callback(payload.old.report_id, count || 0);
            }
          } catch (error) {
            console.error('Error in comments subscription:', error);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up comments subscription');
      subscription.unsubscribe();
    };
  },

  // Report batching for better performance
  async createReportBatched(reportData: Omit<Report, 'id' | 'created_at' | 'updated_at' | 'status'>): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ReportsServiceError('User not authenticated');

    // Add report to batch
    _reportBatch.push(reportData);

    // Start batch timer if not already running
    if (!_batchTimer) {
      _batchTimer = setTimeout(() => {
        _flushReportBatch();
      }, BATCH_DELAY);
    }
  },

  // Force flush any remaining reports
  async flushReportBatch(): Promise<void> {
    if (_batchTimer) {
      clearTimeout(_batchTimer);
      _batchTimer = null;
    }
    await _flushReportBatch();
  },

  // Get like details for a report
  async getLikeDetails(reportId: string): Promise<LikeDetail[]> {
    try {
      // First, fetch all likes for the report
      const { data: likesData, error: likesError } = await supabase
        .from('likes')
        .select('id, user_id, report_id, created_at')
        .eq('report_id', reportId)
        .order('created_at', { ascending: false });

      if (likesError) throw likesError;
      if (!likesData || likesData.length === 0) return [];

      // Extract unique user IDs from likes
      const userIds = [...new Set(likesData.map(like => like.user_id))];

      // Fetch profiles for all users who liked the report
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Create a map of user profiles for easy lookup
      const profilesMap = new Map();
      profilesData?.forEach(profile => {
        profilesMap.set(profile.id, profile);
      });

      // Combine likes with user data
      return likesData.map(like => ({
        id: like.id,
        user_id: like.user_id,
        report_id: like.report_id,
        created_at: like.created_at,
        user: {
          username: profilesMap.get(like.user_id)?.username || 'Unknown',
          avatar_url: profilesMap.get(like.user_id)?.avatar_url || null
        }
      }));
    } catch (error) {
      throw new ReportsServiceError(`Failed to fetch like details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Get like details for a comment
  async getCommentLikeDetails(commentId: string): Promise<LikeDetail[]> {
    try {
      const { data: likesData, error: likesError } = await supabase
        .from('comment_likes')
        .select('id, user_id, comment_id, created_at')
        .eq('comment_id', commentId)
        .order('created_at', { ascending: false });

      if (likesError) throw likesError;
      if (!likesData || likesData.length === 0) return [];

      const userIds = [...new Set(likesData.map(like => like.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profilesMap = new Map();
      profilesData?.forEach(profile => {
        profilesMap.set(profile.id, profile);
      });

      return likesData.map(like => ({
        id: like.id,
        user_id: like.user_id,
        comment_id: like.comment_id,
        created_at: like.created_at,
        user: {
          username: profilesMap.get(like.user_id)?.username || 'Unknown',
          avatar_url: profilesMap.get(like.user_id)?.avatar_url || null
        }
      }));
    } catch (error) {
      throw new ReportsServiceError(`Failed to fetch comment like details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Get like details for a reply
  async getReplyLikeDetails(replyId: string): Promise<LikeDetail[]> {
    try {
      const { data: likesData, error: likesError } = await supabase
        .from('reply_likes')
        .select('id, user_id, reply_id, created_at')
        .eq('reply_id', replyId)
        .order('created_at', { ascending: false });

      if (likesError) throw likesError;
      if (!likesData || likesData.length === 0) return [];

      const userIds = [...new Set(likesData.map(like => like.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profilesMap = new Map();
      profilesData?.forEach(profile => {
        profilesMap.set(profile.id, profile);
      });

      return likesData.map(like => ({
        id: like.id,
        user_id: like.user_id,
        reply_id: like.reply_id,
        created_at: like.created_at,
        user: {
          username: profilesMap.get(like.user_id)?.username || 'Unknown',
          avatar_url: profilesMap.get(like.user_id)?.avatar_url || null
        }
      }));
    } catch (error) {
      throw new ReportsServiceError(`Failed to fetch reply like details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Toggle comment like
  async toggleCommentLike(commentId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ReportsServiceError('User not authenticated');

    // Check if already liked
    const { data: existingLikes, error: checkError } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', user.id);

    if (checkError) throw new ReportsServiceError(`Failed to check comment like: ${checkError.message}`);

    const existingLike = existingLikes && existingLikes.length > 0 ? existingLikes[0] : null;

    if (existingLike) {
      // Unlike
      const { error: deleteError } = await supabase
        .from('comment_likes')
        .delete()
        .eq('id', existingLike.id);

      if (deleteError) throw new ReportsServiceError(`Failed to unlike comment: ${deleteError.message}`);
      return false;
    } else {
      // Like
      const { error: insertError } = await supabase
        .from('comment_likes')
        .insert([{
          comment_id: commentId,
          user_id: user.id
        }]);

      if (insertError) throw new ReportsServiceError(`Failed to like comment: ${insertError.message}`);
      return true;
    }
  },

  // Toggle reply like
  async toggleReplyLike(replyId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ReportsServiceError('User not authenticated');

    // Check if already liked
    const { data: existingLikes, error: checkError } = await supabase
      .from('reply_likes')
      .select('id')
      .eq('reply_id', replyId)
      .eq('user_id', user.id);

    if (checkError) throw new ReportsServiceError(`Failed to check reply like: ${checkError.message}`);

    const existingLike = existingLikes && existingLikes.length > 0 ? existingLikes[0] : null;

    if (existingLike) {
      // Unlike
      const { error: deleteError } = await supabase
        .from('reply_likes')
        .delete()
        .eq('id', existingLike.id);

      if (deleteError) throw new ReportsServiceError(`Failed to unlike reply: ${deleteError.message}`);
      return false;
    } else {
      // Like
      const { error: insertError } = await supabase
        .from('reply_likes')
        .insert([{ reply_id: replyId, user_id: user.id }]);

      if (insertError) throw new ReportsServiceError(`Failed to like reply: ${insertError.message}`);
      return true;
    }
  },

  // Add reply to comment or reply
  async addCommentReply(parentId: string, content: string, isReplyToReply: boolean = false): Promise<CommentReply> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ReportsServiceError('User not authenticated');

    const insertData = isReplyToReply 
      ? { parent_reply_id: parentId, user_id: user.id, content: content.trim() }
      : { parent_comment_id: parentId, user_id: user.id, content: content.trim() };

    const { data, error } = await supabase
      .from('comment_replies')
      .insert([insertData])
      .select()
      .single();

    if (error) throw new ReportsServiceError(`Failed to add reply: ${error.message}`);
    if (!data) throw new ReportsServiceError('Failed to add reply: No data returned');

    // Fetch user profile for the reply
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    return {
      ...data,
      user: profileData
    };
  },

  // Get comment replies with nested replies
  async getCommentReplies(commentId: string): Promise<CommentReply[]> {
    try {
      // Get all replies to this comment (first level)
      const { data: repliesData, error: repliesError } = await supabase
        .from('comment_replies')
        .select('id, parent_comment_id, parent_reply_id, user_id, content, created_at, updated_at')
        .eq('parent_comment_id', commentId)
        .order('created_at', { ascending: true });

      if (repliesError) throw repliesError;
      if (!repliesData || repliesData.length === 0) return [];

      // Extract unique user IDs from all replies
      const userIds = [...new Set(repliesData.map(reply => reply.user_id))];

      // Fetch profiles for all users who replied
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Create a map of user profiles for easy lookup
      const profilesMap = new Map();
      profilesData?.forEach(profile => {
        profilesMap.set(profile.id, profile);
      });

      // Build the nested reply structure
      const buildNestedReplies = async (parentId: string, depth: number = 0): Promise<CommentReply[]> => {
        const { data: nestedReplies } = await supabase
          .from('comment_replies')
          .select('id, parent_comment_id, parent_reply_id, user_id, content, created_at, updated_at')
          .eq('parent_reply_id', parentId)
          .order('created_at', { ascending: true });

        if (!nestedReplies || nestedReplies.length === 0) return [];

        // Likes for nested replies
        const nestedReplyIds = nestedReplies.map(r => r.id);
        const [nestedLikesCounts, nestedUserLikes] = await Promise.all([
          supabase.from('reply_likes').select('reply_id', { count: 'exact', head: false }).in('reply_id', nestedReplyIds),
          supabase.auth.getUser().then(async ({ data: { user } }) => user ? await supabase.from('reply_likes').select('reply_id').eq('user_id', user.id).in('reply_id', nestedReplyIds) : { data: null, error: null })
        ] as const);

        const likesCountMap = new Map<string, number>();
        (nestedLikesCounts.data || []).forEach((row: any) => {
          likesCountMap.set(row.reply_id, (likesCountMap.get(row.reply_id) || 0) + 1);
        });
        const userLikedSet = new Set((nestedUserLikes.data || []).map((r: any) => r.reply_id));

        return await Promise.all(
          nestedReplies.map(async (reply) => ({
            ...reply,
            user: {
              username: profilesMap.get(reply.user_id)?.username || 'Unknown',
              avatar_url: profilesMap.get(reply.user_id)?.avatar_url || null
            },
            reply_depth: depth + 1,
            likes_count: likesCountMap.get(reply.id) || 0,
            is_liked: userLikedSet.has(reply.id),
            replies: await buildNestedReplies(reply.id, depth + 1)
          }))
        );
      };

      // Build the complete nested structure
      const topLevelReplyIds = repliesData.map(r => r.id);
      const [topLikesCounts, topUserLikes] = await Promise.all([
        supabase.from('reply_likes').select('reply_id', { count: 'exact', head: false }).in('reply_id', topLevelReplyIds),
        supabase.auth.getUser().then(async ({ data: { user } }) => user ? await supabase.from('reply_likes').select('reply_id').eq('user_id', user.id).in('reply_id', topLevelReplyIds) : { data: null, error: null })
      ] as const);

      const topLikesCountMap = new Map<string, number>();
      (topLikesCounts.data || []).forEach((row: any) => {
        topLikesCountMap.set(row.reply_id, (topLikesCountMap.get(row.reply_id) || 0) + 1);
      });
      const topUserLikedSet = new Set((topUserLikes.data || []).map((r: any) => r.reply_id));

      const repliesWithNesting = await Promise.all(
        repliesData.map(async (reply) => ({
          ...reply,
          user: {
            username: profilesMap.get(reply.user_id)?.username || 'Unknown',
            avatar_url: profilesMap.get(reply.user_id)?.avatar_url || null
          },
          reply_depth: 0,
          likes_count: topLikesCountMap.get(reply.id) || 0,
          is_liked: topUserLikedSet.has(reply.id),
          replies: await buildNestedReplies(reply.id, 0)
        }))
      );

      return repliesWithNesting;
    } catch (error) {
      throw new ReportsServiceError(`Failed to fetch comment replies: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}; 