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

// Cache for user stats to avoid repeated queries
const userStatsCache = new Map<string, { stats: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

export async function getUserStatsWithCache(userId: string) {
  const cached = userStatsCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.stats;
  }

  // Fetch comprehensive user stats
  const [reportsSubmitted, reportsVerified, reportsResolved, userProfile, daysActive] = await Promise.all([
    // Reports submitted
    supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
    
    // Reports verified (status = 'in_progress' or 'verified')
    supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['in_progress', 'verified']),
    
    // Reports resolved
    supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'resolved'),
    
    // User profile for points
    supabase
      .from('profiles')
      .select('points, created_at')
      .eq('id', userId)
      .single(),
    
    // Calculate days active and reporting streak
    supabase
      .from('reports')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
  ]);

  const stats = {
    reports_submitted: reportsSubmitted.count || 0,
    reports_verified: reportsVerified.count || 0,
    reports_resolved: reportsResolved.count || 0,
    total_points: userProfile.data?.points || 0,
    days_active: calculateDaysActive(userProfile.data?.created_at, daysActive.data?.[0]?.created_at),
    reporting_streak: calculateReportingStreak(daysActive.data || [])
  };

  // Cache the results
  userStatsCache.set(userId, { stats, timestamp: Date.now() });
  
  return stats;
}

function calculateDaysActive(profileCreatedAt: string, firstReportAt: string): number {
  if (!profileCreatedAt) return 0;
  
  const startDate = firstReportAt ? new Date(firstReportAt) : new Date(profileCreatedAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.min(diffDays, 365); // Cap at 365 days
}

function calculateReportingStreak(reports: Array<{ created_at: string }>): number {
  if (!reports || reports.length === 0) return 0;
  
  // Group reports by date
  const reportsByDate = new Map<string, number>();
  reports.forEach(report => {
    const date = new Date(report.created_at).toDateString();
    reportsByDate.set(date, (reportsByDate.get(date) || 0) + 1);
  });
  
  // Get unique dates and sort them
  const uniqueDates = Array.from(reportsByDate.keys())
    .map(dateStr => new Date(dateStr))
    .sort((a, b) => b.getTime() - a.getTime()); // Sort descending (most recent first)
  
  if (uniqueDates.length === 0) return 0;
  
  // Calculate consecutive days from today backwards
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < uniqueDates.length; i++) {
    const reportDate = new Date(uniqueDates[i]);
    reportDate.setHours(0, 0, 0, 0);
    
    const expectedDate = new Date(today);
    expectedDate.setDate(today.getDate() - i);
    
    if (reportDate.getTime() === expectedDate.getTime()) {
      streak++;
    } else {
      break;
    }
  }
  
  return Math.min(streak, 7); // Cap at 7 days for the achievement
}

export async function checkAchievements(userId: string): Promise<Achievement[]> {
  try {
    // Get user's current stats
    const userStats = await getUserStatsWithCache(userId);

    // Get user's current achievements
    const { data: userAchievements, error: achievementsError } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId);

    if (achievementsError) {
      console.error('Error fetching user achievements:', achievementsError);
      return [];
    }

    const earnedAchievementIds = new Set(userAchievements?.map(a => a.achievement_id) || []);
    
    // Check which achievements the user has earned
    const newlyEarnedAchievements: Achievement[] = [];
    
    for (const achievement of ACHIEVEMENTS) {
      if (earnedAchievementIds.has(achievement.id)) continue;
      
      let hasEarned = false;
      
      switch (achievement.requirement.type) {
        case 'reports_submitted':
          hasEarned = userStats.reports_submitted >= achievement.requirement.count;
          break;
        case 'reports_verified':
          hasEarned = userStats.reports_verified >= achievement.requirement.count;
          break;
        case 'reports_resolved':
          hasEarned = userStats.reports_resolved >= achievement.requirement.count;
          break;
        case 'days_active':
          hasEarned = userStats.days_active >= achievement.requirement.count;
          break;
        case 'points_earned':
          hasEarned = userStats.total_points >= achievement.requirement.count;
          break;
      }
      
      if (hasEarned) {
        newlyEarnedAchievements.push(achievement);
        
        // Record the achievement
        try {
          await supabase
            .from('user_achievements')
            .insert({ 
              user_id: userId, 
              achievement_id: achievement.id, 
              earned_at: new Date().toISOString() 
            });

          // Award points for the achievement
          await awardCustomPoints(userId, achievement.points, `ACHIEVEMENT_${achievement.id.toUpperCase()}`);
          
          console.log(`Achievement unlocked: ${achievement.title} for user ${userId}`);
          
          // Trigger achievement notification
          try {
            const { achievementNotificationManager } = await import('../components/AchievementNotification');
            achievementNotificationManager.addNotification(
              achievement.id,
              achievement.title,
              achievement.points,
              achievement.icon
            );
          } catch (e) {
            console.warn('Failed to trigger achievement notification:', e);
          }
        } catch (error) {
          console.error(`Error recording achievement ${achievement.id}:`, error);
        }
      }
    }
    
    return newlyEarnedAchievements;
  } catch (error) {
    console.error('Error checking achievements:', error);
    return [];
  }
}

export async function getUserAchievements(userId: string): Promise<Achievement[]> {
  try {
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
  } catch (error) {
    console.error('Error fetching user achievements:', error);
    return [];
  }
}

export async function getUserAchievementProgress(userId: string): Promise<{
  achievements: Array<Achievement & { unlocked: boolean; progress: number; currentValue: number }>;
  unlockedCount: number;
  totalCount: number;
}> {
  try {
    const userStats = await getUserStatsWithCache(userId);
    const earnedAchievements = await getUserAchievements(userId);
    const earnedIds = new Set(earnedAchievements.map(a => a.id));

    const achievements = ACHIEVEMENTS.map(achievement => {
      let currentValue = 0;
      
      switch (achievement.requirement.type) {
        case 'reports_submitted':
          currentValue = userStats.reports_submitted;
          break;
        case 'reports_verified':
          currentValue = userStats.reports_verified;
          break;
        case 'reports_resolved':
          currentValue = userStats.reports_resolved;
          break;
        case 'days_active':
          // For reporting streak, use the actual streak calculation
          if (achievement.id === 'reporting_streak') {
            currentValue = userStats.reporting_streak || 0;
          } else {
            currentValue = userStats.days_active;
          }
          break;
        case 'points_earned':
          currentValue = userStats.total_points;
          break;
      }

      const unlocked = earnedIds.has(achievement.id);
      // Cap currentValue at the requirement to prevent showing values like 5/1 or 63/7
      const cappedCurrentValue = Math.min(currentValue, achievement.requirement.count);
      const progress = Math.min(100, Math.round((cappedCurrentValue / achievement.requirement.count) * 100));

      return {
        ...achievement,
        unlocked,
        progress,
        currentValue: cappedCurrentValue
      };
    });

    const unlockedCount = achievements.filter(a => a.unlocked).length;
    const totalCount = achievements.length;

    return {
      achievements,
      unlockedCount,
      totalCount
    };
  } catch (error) {
    console.error('Error fetching achievement progress:', error);
    return {
      achievements: [],
      unlockedCount: 0,
      totalCount: ACHIEVEMENTS.length
    };
  }
}

// Clear cache when user stats change
export function clearUserStatsCache(userId?: string) {
  if (userId) {
    userStatsCache.delete(userId);
  } else {
    userStatsCache.clear();
  }
} 