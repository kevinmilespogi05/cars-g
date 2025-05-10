import { supabase } from '../lib/supabase';
import { Activity, Achievement } from '../types';
import { checkAchievements } from '../lib/achievements';
import { initializeUserStats } from '../lib/initAchievements';

export const activityService = {
  async getRecentActivities(userId: string, limit: number = 5): Promise<Activity[]> {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching activities:', error);
      return [];
    }

    return data || [];
  },

  async getLatestAchievements(userId: string, limit: number = 3): Promise<Achievement[]> {
    const { data, error } = await supabase
      .from('user_achievements')
      .select(`
        id,
        user_id,
        earned_at,
        achievements:achievement_id (
          id,
          name,
          description,
          icon,
          points,
          criteria
        )
      `)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching achievements:', error);
      return [];
    }

    // Flatten the result to match your Achievement interface
    return (data || []).map((ua: any) => ({
      ...ua.achievements,
      id: ua.id,
      user_id: ua.user_id,
      earned_at: ua.earned_at,
    }));
  },

  async createActivity(activity: Omit<Activity, 'id' | 'created_at'>): Promise<Activity | null> {
    const { data, error } = await supabase
      .from('activities')
      .insert([activity])
      .select()
      .single();

    if (error) {
      console.error('Error creating activity:', error);
      return null;
    }

    return data;
  },

  async createAchievement(achievement: Omit<Achievement, 'id' | 'earned_at'>): Promise<Achievement | null> {
    const { data, error } = await supabase
      .from('achievements')
      .insert([achievement])
      .select()
      .single();

    if (error) {
      console.error('Error creating achievement:', error);
      return null;
    }

    return data;
  },

  async trackReportCreated(userId: string, reportId: string): Promise<void> {
    try {
      // Initialize user stats if they don't exist
      await initializeUserStats(userId);

      // Create activity record
      await this.createActivity({
        user_id: userId,
        type: 'report_created',
        description: 'Submitted a new report',
        metadata: { report_id: reportId }
      });

      // Get current stats
      const { data: currentStats, error: fetchError } = await supabase
        .from('user_stats')
        .select('reports_submitted')
        .eq('user_id', userId)
        .single();

      if (fetchError) throw fetchError;

      // Update user stats
      const { error: statsError } = await supabase
        .from('user_stats')
        .update({
          reports_submitted: (currentStats?.reports_submitted || 0) + 1,
          last_active: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (statsError) throw statsError;

      // Check for new achievements
      await checkAchievements(userId);
    } catch (error) {
      console.error('Error tracking report creation:', error);
      throw error;
    }
  },

  async trackReportVerified(userId: string, reportId: string): Promise<void> {
    try {
      // Create activity record
      await this.createActivity({
        user_id: userId,
        type: 'report_resolved',
        description: 'Report was verified by authorities',
        metadata: { report_id: reportId }
      });

      // Get current stats
      const { data: currentStats, error: fetchError } = await supabase
        .from('user_stats')
        .select('reports_verified')
        .eq('user_id', userId)
        .single();

      if (fetchError) throw fetchError;

      // Update user stats
      const { error: statsError } = await supabase
        .from('user_stats')
        .update({
          reports_verified: (currentStats?.reports_verified || 0) + 1,
          last_active: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (statsError) throw statsError;

      // Check for new achievements
      await checkAchievements(userId);
    } catch (error) {
      console.error('Error tracking report verification:', error);
      throw error;
    }
  },

  async trackReportResolved(userId: string, reportId: string): Promise<void> {
    try {
      // Create activity record
      await this.createActivity({
        user_id: userId,
        type: 'report_resolved',
        description: 'Report was resolved',
        metadata: { report_id: reportId }
      });

      // Get current stats
      const { data: currentStats, error: fetchError } = await supabase
        .from('user_stats')
        .select('reports_resolved')
        .eq('user_id', userId)
        .single();

      if (fetchError) throw fetchError;

      // Update user stats
      const { error: statsError } = await supabase
        .from('user_stats')
        .update({
          reports_resolved: (currentStats?.reports_resolved || 0) + 1,
          last_active: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (statsError) throw statsError;

      // Check for new achievements
      await checkAchievements(userId);
    } catch (error) {
      console.error('Error tracking report resolution:', error);
      throw error;
    }
  },

  async trackPointsEarned(userId: string, points: number, reason: string): Promise<void> {
    try {
      // Create activity record
      await this.createActivity({
        user_id: userId,
        type: 'points_earned',
        description: `Earned ${points} points: ${reason}`,
        metadata: { points, reason }
      });

      // Get current stats
      const { data: currentStats, error: fetchError } = await supabase
        .from('user_stats')
        .select('total_points')
        .eq('user_id', userId)
        .single();

      if (fetchError) throw fetchError;

      // Update user stats
      const { error: statsError } = await supabase
        .from('user_stats')
        .update({
          total_points: (currentStats?.total_points || 0) + points,
          last_active: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (statsError) throw statsError;

      // Check for new achievements
      await checkAchievements(userId);
    } catch (error) {
      console.error('Error tracking points earned:', error);
      throw error;
    }
  }
}; 