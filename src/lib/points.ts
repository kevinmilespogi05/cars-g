import { supabase } from './supabase';

const POINTS_CONFIG = {
  REPORT_SUBMITTED: 25,   // Points awarded when a report is submitted
  REPORT_VERIFIED: 50,    // Points awarded when report is verified by authorities
  REPORT_RESOLVED: 100,   // Points awarded when the issue is resolved
  DAILY_LOGIN: 5,         // Points for daily engagement
  PROFILE_COMPLETED: 25,  // Points for completing profile
};

export async function awardPoints(
  userId: string,
  reason: keyof typeof POINTS_CONFIG,
  reportId?: string
) {
  const points = POINTS_CONFIG[reason];

  // Use a single RPC call to handle all operations atomically
  const { data, error } = await supabase.rpc('award_points', {
    user_id: userId,
    points_to_award: points,
    reason_text: reason,
    report_id: reportId || null
  });

  if (error) throw error;
  return points;
}

// Award an arbitrary number of points with a custom reason. Useful for achievements.
export async function awardCustomPoints(
  userId: string,
  points: number,
  reasonText: string,
  reportId?: string
) {
  const { error } = await supabase.rpc('award_points', {
    user_id: userId,
    points_to_award: points,
    reason_text: reasonText,
    report_id: reportId || null
  });
  if (error) throw error;
  return points;
}

export async function getPointsHistory(userId: string) {
  const { data, error } = await supabase
    .from('points_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getLeaderboard(limit = 10) {
  // Use a raw SQL query to get accurate counts
  const { data, error } = await supabase
    .rpc('get_user_leaderboard', { limit_count: limit });

  if (error) throw error;

  return data;
}