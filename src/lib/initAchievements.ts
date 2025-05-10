import { supabase } from './supabase';
import { ACHIEVEMENTS } from './achievements';

export async function initializeAchievements() {
  try {
    // Check if achievements already exist
    const { data: existingAchievements, error: checkError } = await supabase
      .from('achievements')
      .select('id')
      .limit(1);

    if (checkError) throw checkError;

    // If achievements already exist, skip initialization
    if (existingAchievements && existingAchievements.length > 0) {
      console.log('Achievements already initialized');
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

    console.log('Achievements initialized successfully');
  } catch (error) {
    console.error('Error initializing achievements:', error);
    throw error;
  }
}

export async function initializeUserStats(userId: string) {
  try {
    // Check if user stats already exist
    const { data: existingStats, error: checkError } = await supabase
      .from('user_stats')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') throw checkError;

    // If user stats already exist, skip initialization
    if (existingStats) {
      console.log('User stats already initialized');
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

    console.log('User stats initialized successfully');
  } catch (error) {
    console.error('Error initializing user stats:', error);
    throw error;
  }
} 