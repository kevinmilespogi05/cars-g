import { supabase } from '../lib/supabase';
import type { ReportComment } from '../types';
import { reportsService } from './reportsService';

export class CommentsService {
  // Get comments for a specific report
  static async getComments(reportId: string): Promise<ReportComment[]> {
    try {
      const { data: comments, error: commentsError } = await supabase
        .from('report_comments')
        .select('*')
        .eq('report_id', reportId)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;

      if (!comments || comments.length === 0) {
        return [];
      }

      // Get unique user IDs from comments
      const userIds = [...new Set(comments.map(c => c.user_id))];

      // Fetch user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      if (profilesError) {
        console.warn('Error fetching profiles:', profilesError);
      }

      // Map profiles to comments
      const profileMap = new Map();
      profiles?.forEach(profile => {
        profileMap.set(profile.id, profile);
      });

      // Get current user for localStorage access
      const { data: { user } } = await supabase.auth.getUser();
      
      // For report comments, we'll use localStorage for likes
      // since the comment_likes table has foreign key constraints to the comments table
      const allLikesKey = 'report_comment_all_likes';
      const allLikes = JSON.parse(localStorage.getItem(allLikesKey) || '{}');
      const userLikes = allLikes[user?.id] || {};
      const userLikesSet = new Set(Object.keys(userLikes).filter(commentId => userLikes[commentId]));

      // Start with 0 likes for all comments
      // Only increment when users actually like comments
      const likeCounts = new Map<string, number>();
      
      comments.forEach(comment => {
        // Count how many users have liked this comment
        let likeCount = 0;
        Object.keys(allLikes).forEach(userId => {
          if (allLikes[userId] && allLikes[userId][comment.id]) {
            likeCount++;
          }
        });
        likeCounts.set(comment.id, likeCount);
      });

      // Combine comments with user profiles and like data, and hydrate replies (including mock report-comment replies)
      const result = await Promise.all(comments.map(async (comment) => {
        try {
          const replies = await reportsService.getCommentReplies(comment.id);
          return {
            ...comment,
            user_profile: profileMap.get(comment.user_id) || { username: 'Unknown', avatar_url: null },
            likes_count: likeCounts.get(comment.id) || 0,
            is_liked: userLikesSet.has(comment.id),
            replies_count: replies.length || 0,
            replies: replies
          } as ReportComment;
        } catch {
          return {
            ...comment,
            user_profile: profileMap.get(comment.user_id) || { username: 'Unknown', avatar_url: null },
            likes_count: likeCounts.get(comment.id) || 0,
            is_liked: userLikesSet.has(comment.id),
            replies_count: 0,
            replies: []
          } as ReportComment;
        }
      }));

      return result;
    } catch (error) {
      console.error('Error fetching comments:', error);
      throw error;
    }
  }

  // Add a new comment
  static async addComment(
    reportId: string,
    comment: string,
    commentType: 'comment' | 'status_update' | 'assignment' | 'resolution' = 'comment'
  ): Promise<ReportComment> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('report_comments')
        .insert({
          report_id: reportId,
          user_id: user.id,
          comment,
          comment_type: commentType
        })
        .select('*')
        .single();

      if (error) throw error;

      // Fetch user profile for the new comment
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single();

      return {
        ...data,
        user_profile: profile || { username: 'Unknown', avatar_url: null }
      };
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  // Update a comment
  static async updateComment(commentId: string, comment: string): Promise<ReportComment> {
    try {
      // Fetch current version to record history
      const { data: existing, error: fetchErr } = await supabase
        .from('report_comments')
        .select('id, comment, user_id')
        .eq('id', commentId)
        .single();
      if (fetchErr) throw fetchErr;

      // Record edit history (append-only)
      try {
        await supabase
          .from('report_comment_edits')
          .insert({
            comment_id: commentId,
            previous_comment: existing?.comment || '',
          });
      } catch (e) {
        console.warn('Edit history insert failed (table may not exist):', e);
      }

      const { data, error } = await supabase
        .from('report_comments')
        .update({ comment, updated_at: new Date().toISOString() })
        .eq('id', commentId)
        .select('*')
        .single();

      if (error) throw error;

      // Fetch user profile for the updated comment
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', data.user_id)
        .single();

      return {
        ...data,
        user_profile: profile || { username: 'Unknown', avatar_url: null }
      };
    } catch (error) {
      console.error('Error updating comment:', error);
      throw error;
    }
  }

  // Delete a comment
  static async deleteComment(commentId: string): Promise<void> {
    try {
      // Soft delete fallback: keep a tombstone history if edits table exists
      try {
        await supabase
          .from('report_comment_edits')
          .insert({ comment_id: commentId, previous_comment: '[deleted]' });
      } catch {}

      const { error } = await supabase
        .from('report_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  }

  // Retrieve edit history entries (most recent first). If table missing, return empty.
  static async getEditHistory(commentId: string): Promise<{ id: string; previous_comment: string; created_at: string }[]> {
    try {
      const { data, error } = await supabase
        .from('report_comment_edits')
        .select('id, previous_comment, created_at')
        .eq('comment_id', commentId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.warn('getEditHistory failed (likely no table yet):', e);
      return [];
    }
  }

  // Subscribe to comments changes for a report
  static subscribeToCommentsChanges(
    reportId: string,
    callback: (comments: ReportComment[]) => void
  ) {
    const subscription = supabase
      .channel(`report_comments_${reportId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'report_comments',
          filter: `report_id=eq.${reportId}`
        },
        async () => {
          try {
            const comments = await this.getComments(reportId);
            callback(comments);
          } catch (error) {
            console.error('Error in comments subscription:', error);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }

  // Get comment count for a report
  static async getCommentCount(reportId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('report_comments')
        .select('*', { count: 'exact', head: true })
        .eq('report_id', reportId);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting comment count:', error);
      return 0;
    }
  }

  // Refresh comments with updated like data
  static async refreshComments(reportId: string): Promise<ReportComment[]> {
    return this.getComments(reportId);
  }

  // Update like count for a specific comment
  static updateCommentLikeCount(comments: ReportComment[], commentId: string, isLiked: boolean): ReportComment[] {
    // Get all likes from localStorage
    const allLikesKey = 'report_comment_all_likes';
    const allLikes = JSON.parse(localStorage.getItem(allLikesKey) || '{}');
    
    // Count total likes for this comment
    let totalLikes = 0;
    Object.keys(allLikes).forEach(userId => {
      if (allLikes[userId] && allLikes[userId][commentId]) {
        totalLikes++;
      }
    });
    
    return comments.map(comment => 
      comment.id === commentId 
        ? { 
            ...comment, 
            is_liked: isLiked,
            likes_count: totalLikes
          }
        : comment
    );
  }
}