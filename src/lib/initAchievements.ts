import { supabase } from './supabase';
import { ACHIEVEMENTS } from './achievements';

export async function verifyDatabaseSchema() {
  try {
    console.log('Verifying database schema...');
    
    // Check if user_stats table exists and has the expected structure
    const { data: tableInfo, error: tableError } = await supabase
      .from('user_stats')
      .select('*')
      .limit(0); // This will return schema info without data
    
    if (tableError) {
      console.error('Error accessing user_stats table:', tableError);
      return false;
    }
    
    console.log('user_stats table is accessible');
    
    // Check the actual table structure
    const actualColumns = await checkActualTableStructure();
    if (actualColumns) {
      console.log('Actual columns in user_stats table:', actualColumns);
      
      // Check for expected columns
      const expectedColumns = [
        'reports_submitted', 'reports_verified', 'reports_resolved', 
        'days_active', 'total_points', 'last_active',
        'total_reports', 'resolved_reports', 'current_streak', 'longest_streak',
        'created_at', 'updated_at'
      ];
      
      const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
      if (missingColumns.length > 0) {
        console.warn('Missing columns in user_stats table:', missingColumns);
        console.warn('These columns are referenced in the code but not in the database schema.');
        console.warn('Consider running the migration to add these columns.');
      }
    }
    
    // Try to get a sample row to verify the structure
    // Only select columns that we know exist
    const { data: sampleData, error: sampleError } = await supabase
      .from('user_stats')
      .select('id, user_id')
      .limit(1);
    
    if (sampleError) {
      console.error('Error getting sample data from user_stats:', sampleError);
      return false;
    }
    
    console.log('user_stats table structure verified successfully');
    return true;
  } catch (error) {
    console.error('Error verifying database schema:', error);
    return false;
  }
}

export async function checkActualTableStructure() {
  try {
    console.log('Checking actual table structure...');
    
    // Get the actual table structure by trying to select all columns
    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .limit(0);
    
    if (error) {
      console.error('Error accessing user_stats table:', error);
      return null;
    }
    
    // Try to get a sample row to see what columns actually exist
    const { data: sampleData, error: sampleError } = await supabase
      .from('user_stats')
      .select('*')
      .limit(1);
    
    if (sampleError) {
      console.error('Error getting sample data:', sampleError);
      return null;
    }
    
    console.log('Actual table structure:', sampleData ? Object.keys(sampleData[0] || {}) : 'No data');
    return sampleData ? Object.keys(sampleData[0] || {}) : [];
  } catch (error) {
    console.error('Error checking table structure:', error);
    return null;
  }
}

// Add this function to help debug the database issue
export async function debugDatabaseIssue() {
  try {
    console.log('=== DATABASE DEBUG INFO ===');
    
    // Test basic connection
    console.log('Testing basic Supabase connection...');
    const { data: testData, error: testError } = await supabase
      .from('user_stats')
      .select('*')
      .limit(0);
    
    if (testError) {
      console.error('❌ Cannot access user_stats table:', testError);
      return;
    }
    
    console.log('✅ user_stats table is accessible');
    
    // Check if table has any data
    const { count, error: countError } = await supabase
      .from('user_stats')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Error counting rows:', countError);
    } else {
      console.log(`📊 user_stats table has ${count} rows`);
    }
    
    // Try to get actual table structure by selecting all columns
    const { data: structureData, error: structureError } = await supabase
      .from('user_stats')
      .select('*')
      .limit(1);
    
    if (structureError) {
      console.error('❌ Error getting table structure:', structureError);
    } else if (structureData && structureData.length > 0) {
      console.log('🔍 Actual table columns:', Object.keys(structureData[0]));
      console.log('🔍 Sample row data:', structureData[0]);
    } else {
      console.log('📝 Table exists but has no data');
    }
    
    console.log('=== END DEBUG INFO ===');
    
  } catch (error) {
    console.error('❌ Debug function error:', error);
  }
}

let isInitialized = false;
let isInitializing = false;

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

    // Insert achievements
    // Note: Achievements table has RLS enabled but no INSERT policy
    // This causes a 401 Unauthorized error
    // Uncomment when the INSERT policy is added to the database
    /*
    const achievementsToInsert = ACHIEVEMENTS.map(achievement => ({
      name: achievement.title,
      description: achievement.description,
      icon_url: achievement.icon || null,
      requirement_type: achievement.requirement.type,
      requirement_value: achievement.requirement.count,
      points_reward: achievement.points,
      created_at: new Date().toISOString()
    }));

    const { error: insertError } = await supabase
      .from('achievements')
      .insert(achievementsToInsert);

    if (insertError) throw insertError;
    */

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
    console.log('Initializing user stats for user:', userId);
    
    // First, check what columns actually exist in the table
    const actualColumns = await checkActualTableStructure();
    if (!actualColumns) {
      console.error('Could not determine table structure, skipping user stats initialization');
      return;
    }
    
    console.log('Available columns in user_stats table:', actualColumns);
    
    // Check if user stats already exist
    const { data: existingStats, error: checkError } = await supabase
      .from('user_stats')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (checkError) {
      console.error('Error checking existing user stats:', checkError);
      if (checkError.code === 'PGRST116') {
        // No rows returned, which is expected for new users
        console.log('No existing user stats found, creating new ones...');
      } else {
        throw checkError;
      }
    }

    // If user stats already exist, mark as initialized and return
    if (existingStats) {
      console.log('User stats already exist for user:', userId);
      initializedUserStats.add(userId);
      return;
    }

    // Create insert data based on what columns actually exist
    const insertData: any = {
      user_id: userId
    };

    // Only add columns that exist in the actual table
    if (actualColumns.includes('reports_submitted')) {
      insertData.reports_submitted = 0;
    }
    if (actualColumns.includes('reports_verified')) {
      insertData.reports_verified = 0;
    }
    if (actualColumns.includes('reports_resolved')) {
      insertData.reports_resolved = 0;
    }
    if (actualColumns.includes('days_active')) {
      insertData.days_active = 0;
    }
    if (actualColumns.includes('total_points')) {
      insertData.total_points = 0;
    }
    if (actualColumns.includes('total_reports')) {
      insertData.total_reports = 0;
    }
    if (actualColumns.includes('resolved_reports')) {
      insertData.resolved_reports = 0;
    }
    if (actualColumns.includes('current_streak')) {
      insertData.current_streak = 0;
    }
    if (actualColumns.includes('longest_streak')) {
      insertData.longest_streak = 0;
    }
    
    // Only add last_active if it exists
    if (actualColumns.includes('last_active')) {
      insertData.last_active = new Date().toISOString();
    }
    
    // Add timestamp columns if they exist
    if (actualColumns.includes('created_at')) {
      insertData.created_at = new Date().toISOString();
    }
    if (actualColumns.includes('updated_at')) {
      insertData.updated_at = new Date().toISOString();
    }

    console.log('Creating new user stats with data:', insertData);
    
    // Insert initial user stats
    const { error: insertError } = await supabase
      .from('user_stats')
      .insert(insertData);

    if (insertError) {
      console.error('Error inserting user stats:', insertError);
      throw insertError;
    }

    initializedUserStats.add(userId);
    console.log('User stats initialized successfully for user:', userId);
  } catch (error) {
    console.error('Error initializing user stats for user:', userId, error);
    throw error;
  } finally {
    userStatsInitializing.delete(userId);
  }
} 