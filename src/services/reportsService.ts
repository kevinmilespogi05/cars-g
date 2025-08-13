import { supabase } from '../lib/supabase';
import { Report } from '../types';

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
  }
}; 