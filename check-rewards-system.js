/**
 * Quick Rewards System Check
 * This script checks if the rewards system is properly configured and working
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
}

async function checkEnvironment() {
  log('🔧 Checking Environment Configuration...');
  
  if (!process.env.VITE_SUPABASE_URL) {
    log('❌ VITE_SUPABASE_URL not set', 'error');
    return false;
  }
  
  if (!process.env.VITE_SUPABASE_ANON_KEY) {
    log('❌ VITE_SUPABASE_ANON_KEY not set', 'error');
    return false;
  }
  
  log('✅ Environment variables configured');
  return true;
}

async function checkDatabaseConnection() {
  log('🔌 Testing Database Connection...');
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
    
    log('✅ Database connection successful');
    return true;
  } catch (error) {
    log(`❌ Database connection failed: ${error.message}`, 'error');
    return false;
  }
}

async function checkRequiredTables() {
  log('📋 Checking Required Tables...');
  
  const tables = ['profiles', 'points_history', 'user_stats'];
  const results = {};
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        results[table] = { exists: false, error: error.message };
      } else {
        results[table] = { exists: true };
      }
    } catch (error) {
      results[table] = { exists: false, error: error.message };
    }
  }
  
  let allExist = true;
  for (const [table, result] of Object.entries(results)) {
    if (result.exists) {
      log(`✅ Table '${table}' exists`);
    } else {
      log(`❌ Table '${table}' missing: ${result.error}`, 'error');
      allExist = false;
    }
  }
  
  return allExist;
}

async function checkAwardPointsFunction() {
  log('⚙️ Checking award_points Function...');
  
  try {
    // Test with a dummy call to see if the function exists
    const { data, error } = await supabase.rpc('award_points', {
      user_id: '00000000-0000-0000-0000-000000000000',
      points_to_award: 0,
      reason_text: 'TEST',
      report_id: null
    });
    
    if (error) {
      if (error.message.includes('User profile not found')) {
        log('✅ award_points function exists and working (correctly rejected invalid user)');
        return true;
      } else {
        throw new Error(`Function error: ${error.message}`);
      }
    } else {
      log('✅ award_points function exists');
      return true;
    }
  } catch (error) {
    log(`❌ award_points function check failed: ${error.message}`, 'error');
    return false;
  }
}

async function checkTestUsers() {
  log('👥 Checking for Test Users...');
  
  try {
    // Check for regular users
    const { data: regularUsers } = await supabase
      .from('profiles')
      .select('id, username, role, points')
      .eq('role', 'user')
      .limit(3);
    
    // Check for patrol users
    const { data: patrolUsers } = await supabase
      .from('profiles')
      .select('id, username, role, points')
      .eq('role', 'patrol')
      .limit(3);
    
    if (!regularUsers || regularUsers.length === 0) {
      log('⚠️ No regular users found (role="user")', 'warn');
    } else {
      log(`✅ Found ${regularUsers.length} regular users`);
      regularUsers.forEach(user => {
        log(`   - ${user.username} (${user.id}) - ${user.points || 0} points`);
      });
    }
    
    if (!patrolUsers || patrolUsers.length === 0) {
      log('⚠️ No patrol users found (role="patrol")', 'warn');
    } else {
      log(`✅ Found ${patrolUsers.length} patrol users`);
      patrolUsers.forEach(user => {
        log(`   - ${user.username} (${user.id}) - ${user.points || 0} points`);
      });
    }
    
    return {
      regularUsers: regularUsers || [],
      patrolUsers: patrolUsers || []
    };
    
  } catch (error) {
    log(`❌ Failed to check test users: ${error.message}`, 'error');
    return { regularUsers: [], patrolUsers: [] };
  }
}

async function checkPointsHistory() {
  log('📊 Checking Points History...');
  
  try {
    const { data: recentHistory, error } = await supabase
      .from('points_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      log(`❌ Failed to fetch points history: ${error.message}`, 'error');
      return false;
    }
    
    if (!recentHistory || recentHistory.length === 0) {
      log('⚠️ No points history found - system may not have been used yet', 'warn');
    } else {
      log(`✅ Found ${recentHistory.length} recent points history entries`);
      recentHistory.forEach(entry => {
        log(`   - ${entry.reason}: +${entry.points} points (${entry.created_at})`);
      });
    }
    
    return true;
  } catch (error) {
    log(`❌ Points history check failed: ${error.message}`, 'error');
    return false;
  }
}

async function runQuickTest() {
  log('🚀 Starting Quick Rewards System Check...');
  
  const results = {
    environment: false,
    database: false,
    tables: false,
    function: false,
    users: { regularUsers: [], patrolUsers: [] },
    history: false
  };
  
  // Check environment
  results.environment = await checkEnvironment();
  if (!results.environment) {
    log('❌ Environment check failed. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY', 'error');
    return results;
  }
  
  // Check database connection
  results.database = await checkDatabaseConnection();
  if (!results.database) {
    log('❌ Database connection failed', 'error');
    return results;
  }
  
  // Check required tables
  results.tables = await checkRequiredTables();
  if (!results.tables) {
    log('❌ Required tables missing', 'error');
    return results;
  }
  
  // Check award_points function
  results.function = await checkAwardPointsFunction();
  if (!results.function) {
    log('❌ award_points function not working', 'error');
    return results;
  }
  
  // Check test users
  results.users = await checkTestUsers();
  
  // Check points history
  results.history = await checkPointsHistory();
  
  // Print summary
  log('\n📋 System Check Summary:');
  log('='.repeat(40));
  log(`Environment: ${results.environment ? '✅' : '❌'}`);
  log(`Database: ${results.database ? '✅' : '❌'}`);
  log(`Tables: ${results.tables ? '✅' : '❌'}`);
  log(`Function: ${results.function ? '✅' : '❌'}`);
  log(`Regular Users: ${results.users.regularUsers.length}`);
  log(`Patrol Users: ${results.users.patrolUsers.length}`);
  log(`Points History: ${results.history ? '✅' : '❌'}`);
  
  const allGood = results.environment && results.database && results.tables && results.function;
  
  if (allGood) {
    log('\n🎉 Rewards system is properly configured and ready for testing!');
    
    if (results.users.regularUsers.length > 0 && results.users.patrolUsers.length > 0) {
      log('💡 You can now run the full test suite with: node test-rewards-node.js');
    } else {
      log('💡 Create some test users with roles "user" and "patrol" to run the full test suite');
    }
  } else {
    log('\n⚠️ Some issues found. Please fix them before running the full test suite.');
  }
  
  return results;
}

// Run the quick check
runQuickTest().catch(error => {
  log(`❌ Quick check failed: ${error.message}`, 'error');
  process.exit(1);
});
