import { supabase } from './supabase';
import { awardCustomPoints } from './points';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  points: number;
  icon: string;
  requirement: {
    type: 'reports_submitted' | 'reports_verified' | 'reports_resolved' | 'days_active' | 'points_earned';
    count: number;
  };
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_report',
    title: 'First Report',
    description: 'Submit your first community issue report',
    points: 25,
    icon: '📝',
    requirement: {
      type: 'reports_submitted',
      count: 1
    }
  },
  {
    id: 'reporting_streak',
    title: 'Reporting Streak',
    description: 'Submit reports for 7 consecutive days',
    points: 100,
    icon: '🔥',
    requirement: {
      type: 'days_active',
      count: 7
    }
  },
  {
    id: 'verified_reporter',
    title: 'Verified Reporter',
    description: 'Have 5 reports verified by administrators',
    points: 150,
    icon: '✅',
    requirement: {
      type: 'reports_verified',
      count: 5
    }
  },
  {
    id: 'community_champion',
    title: 'Community Champion',
    description: 'Earn 1000 total points',
    points: 200,
    icon: '🏆',
    requirement: {
      type: 'points_earned',
      count: 1000
    }
  },
  {
    id: 'problem_solver',
    title: 'Problem Solver',
    description: 'Have 10 reports resolved',
    points: 300,
    icon: '🔧',
    requirement: {
      type: 'reports_resolved',
      count: 10
    }
  }
];

export async function checkAchievements(userId: string): Promise<Achievement[]> {
  // Get user's current stats
  const { data: userStats, error: statsError } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (statsError) throw statsError;

  // Get user's current achievements
  const { data: userAchievements, error: achievementsError } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId);

  if (achievementsError) throw achievementsError;

  const earnedAchievementIds = userAchievements.map(a => a.achievement_id);
  
  // Check which achievements the user has earned
  const newlyEarnedAchievements: Achievement[] = [];
  
  for (const achievement of ACHIEVEMENTS) {
    if (earnedAchievementIds.includes(achievement.id)) continue;
    
    let hasEarned = false;
    
    switch (achievement.requirement.type) {
      case 'reports_submitted':
        hasEarned = (userStats.reports_submitted || 0) >= achievement.requirement.count;
        break;
      case 'reports_verified':
        hasEarned = (userStats.reports_verified || 0) >= achievement.requirement.count;
        break;
      case 'reports_resolved':
        hasEarned = (userStats.reports_resolved || 0) >= achievement.requirement.count;
        break;
      case 'days_active':
        hasEarned = (userStats.days_active || 0) >= achievement.requirement.count;
        break;
      case 'points_earned':
        hasEarned = (userStats.total_points || 0) >= achievement.requirement.count;
        break;
    }
    
    if (hasEarned) {
      newlyEarnedAchievements.push(achievement);
      
      // Record the achievement
      // Insert achievement and award points atomically (best-effort; RPC recommended)
      await supabase
        .from('user_achievements')
        .insert({ user_id: userId, achievement_id: achievement.id, earned_at: new Date().toISOString() });

      await awardCustomPoints(userId, achievement.points, `ACHIEVEMENT_${achievement.id.toUpperCase()}`);
    }
  }
  
  return newlyEarnedAchievements;
}

export async function getUserAchievements(userId: string): Promise<Achievement[]> {
  const { data, error } = await supabase
    .from('user_achievements')
    .select('achievement_id, earned_at')
    .eq('user_id', userId);
    
  if (error) throw error;
  
  return data.map(item => {
    const achievement = ACHIEVEMENTS.find(a => a.id === item.achievement_id);
    return {
      ...achievement!,
      earnedAt: item.earned_at
    };
  });
} 