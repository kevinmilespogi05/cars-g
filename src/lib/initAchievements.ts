import { supabase } from './supabase';
import { ACHIEVEMENTS } from './achievements';

let isInitializing = false;
let isInitialized = false;

export async function initializeAchievements() {
  // If already initialized or currently initializing, skip
  if (isInitialized || isInitializing) {
    return;
  }

  isInitializing = true;

  try {
    // Check if achievements already exist
    const { data: existingAchievements, error: checkError } = await supabase
      .from('achievements')
      .select('id')
      .limit(1);

    if (checkError) throw checkError;

    // If achievements already exist, mark as initialized and return
    if (existingAchievements && existingAchievements.length > 0) {
      isInitialized = true;
      return;
    }

    // Insert all achievements
    const { error: insertError } = await supabase
      .from('achievements')
      .insert(
        ACHIEVEMENTS.map(achievement => ({
          id: achievement.id,
          name: achievement.title,
          description: achievement.description,
          icon: achievement.icon,
          points: achievement.points,
          criteria: achievement.requirement.type,
          requirement_type: achievement.requirement.type,
          requirement_count: achievement.requirement.count
        }))
      );

    if (insertError) throw insertError;

    isInitialized = true;
    console.log('Achievements initialized successfully');
  } catch (error) {
    console.error('Error initializing achievements:', error);
    throw error;
  } finally {
    isInitializing = false;
  }
}

let userStatsInitializing = new Set<string>();
let initializedUserStats = new Set<string>();

export async function initializeUserStats(userId: string) {
  // If already initialized or currently initializing for this user, skip
  if (initializedUserStats.has(userId) || userStatsInitializing.has(userId)) {
    return;
  }

  userStatsInitializing.add(userId);

  try {
    // Check if user stats already exist
    const { data: existingStats, error: checkError } = await supabase
      .from('user_stats')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') throw checkError;

    // If user stats already exist, mark as initialized and return
    if (existingStats) {
      initializedUserStats.add(userId);
      return;
    }

    // Insert initial user stats
    const { error: insertError } = await supabase
      .from('user_stats')
      .insert({
        user_id: userId,
        reports_submitted: 0,
        reports_verified: 0,
        reports_resolved: 0,
        days_active: 0,
        total_points: 0,
        last_active: new Date().toISOString()
      });

    if (insertError) throw insertError;

    initializedUserStats.add(userId);
    console.log('User stats initialized successfully');
  } catch (error) {
    console.error('Error initializing user stats:', error);
    throw error;
  } finally {
    userStatsInitializing.delete(userId);
  }
} 