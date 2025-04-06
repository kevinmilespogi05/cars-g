import { supabase } from './supabase';

const POINTS_CONFIG = {
  REPORT_SUBMITTED: 10,
  REPORT_VERIFIED: 50,
  REPORT_RESOLVED: 100,
  DAILY_LOGIN: 5,
  PROFILE_COMPLETED: 25,
};

export async function awardPoints(
  userId: string,
  reason: keyof typeof POINTS_CONFIG,
  reportId?: string
) {
  const points = POINTS_CONFIG[reason];

  // Add points to user's profile
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ points: supabase.raw('points + ?', [points]) })
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
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, points, avatar_url')
    .order('points', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
} 