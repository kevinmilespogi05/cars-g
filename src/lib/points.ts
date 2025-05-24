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

  // First get current points
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('points')
    .eq('id', userId)
    .single();

  if (fetchError) throw fetchError;

  // Calculate new points total
  const newPoints = (profile?.points || 0) + points;

  // Update points in profile
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ points: newPoints })
    .eq('id', userId);

  if (profileError) throw profileError;

  // Record points history
  const { error: historyError } = await supabase
    .from('points_history')
    .insert({
      user_id: userId,
      points,
      reason,
      report_id: reportId,
    });

  if (historyError) throw historyError;

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