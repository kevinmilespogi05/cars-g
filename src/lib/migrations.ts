import { supabase } from './supabase';
import { initializeUserStats } from './initAchievements';

export async function migrateExistingUsers() {
  try {
    // Get all users from profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id');

    if (profilesError) throw profilesError;

    // Initialize stats for each user
    for (const profile of profiles || []) {
      try {
        await initializeUserStats(profile.id);
        console.log(`Initialized stats for user ${profile.id}`);
      } catch (error) {
        console.error(`Failed to initialize stats for user ${profile.id}:`, error);
        // Continue with next user even if one fails
      }
    }

    console.log('User stats migration completed');
  } catch (error) {
    console.error('Error during user stats migration:', error);
    throw error;
  }
} 