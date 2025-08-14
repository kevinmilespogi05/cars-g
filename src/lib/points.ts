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

export interface PointsHistory {
  id: string;
  points: number;
  reason: string;
  created_at: string;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  points: number;
  avatar_url: string | null;
  role: string;
  reports_submitted: number;
  reports_verified: number;
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

export async function getLeaderboard(limit = 10, includeAdmins = false) {
  // Use different functions based on whether we want to include admins
  const functionName = includeAdmins ? 'get_admin_leaderboard' : 'get_user_leaderboard';
  
  const { data, error } = await supabase
    .rpc(functionName, { limit_count: limit });

  if (error) throw error;

  return data;
}

export async function getLeaderboardForUser(limit = 10, userRole?: string) {
  // If user is admin, they can see all users including admins
  // If user is not admin, they only see normal users
  const includeAdmins = userRole === 'admin';
  
  return getLeaderboard(limit, includeAdmins);
}