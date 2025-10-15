/**
 * Simple Rewards Distribution Test
 * This script tests the rewards system with actual database calls
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Test configuration
const POINTS_CONFIG = {
  REPORT_VERIFIED: 25,
  REPORT_RESOLVED: 100,
  PATROL_HIGH: 50,
  PATROL_MEDIUM: 25,
  PATROL_LOW: 10
};

async function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
}

async function getTestUsers() {
  log('🔍 Finding test users...');
  
  // Get a regular user
  const { data: regularUser } = await supabase
    .from('profiles')
    .select('id, username, role, points')
    .eq('role', 'user')
    .limit(1)
    .single();
  
  // Get a patrol user
  const { data: patrolUser } = await supabase
    .from('profiles')
    .select('id, username, role, points')
    .eq('role', 'patrol')
    .limit(1)
    .single();
  
  if (!regularUser) {
    throw new Error('No regular users found. Please create a user with role="user"');
  }
  
  if (!patrolUser) {
    throw new Error('No patrol users found. Please create a user with role="patrol"');
  }
  
  log(`Found regular user: ${regularUser.username} (${regularUser.id})`);
  log(`Found patrol user: ${patrolUser.username} (${patrolUser.id})`);
  
  return { regularUser, patrolUser };
}

async function testAwardPoints(userId, reason, expectedPoints) {
  log(`🧪 Testing awardPoints: ${reason} (+${expectedPoints} points)`);
  
  try {
    // Get initial points
    const { data: initialProfile } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', userId)
      .single();
    
    const initialPoints = initialProfile?.points || 0;
    log(`Initial points: ${initialPoints}`);
    
    // Award points using the RPC function
    const { data, error } = await supabase.rpc('award_points', {
      user_id: userId,
      points_to_award: expectedPoints,
      reason_text: reason,
      report_id: null
    });
    
    if (error) {
      throw new Error(`RPC call failed: ${error.message}`);
    }
    
    // Verify points were added
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', userId)
      .single();
    
    const newPoints = updatedProfile?.points || 0;
    const actualIncrease = newPoints - initialPoints;
    
    if (actualIncrease !== expectedPoints) {
      throw new Error(`Points mismatch: expected +${expectedPoints}, got +${actualIncrease}`);
    }
    
    // Check points history
    const { data: pointsHistory } = await supabase
      .from('points_history')
      .select('*')
      .eq('user_id', userId)
      .eq('reason', reason)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (!pointsHistory) {
      throw new Error('Points history entry not found');
    }
    
    if (pointsHistory.points !== expectedPoints) {
      throw new Error(`Points history mismatch: expected ${expectedPoints}, got ${pointsHistory.points}`);
    }
    
    // Check user_stats
    const { data: userStats } = await supabase
      .from('user_stats')
      .select('total_points')
      .eq('user_id', userId)
      .single();
    
    if (userStats && userStats.total_points !== newPoints) {
      log(`⚠️ User stats mismatch: profile has ${newPoints}, user_stats has ${userStats.total_points}`, 'warn');
    }
    
    log(`✅ ${reason} test passed: +${actualIncrease} points awarded`);
    return true;
    
  } catch (error) {
    log(`❌ ${reason} test failed: ${error.message}`, 'error');
    return false;
  }
}

async function testPatrolRewards(patrolUserId) {
  log('🚔 Testing Patrol Officer Rewards...');
  
  const testCases = [
    { priority: 'high', expectedPoints: POINTS_CONFIG.PATROL_HIGH },
    { priority: 'medium', expectedPoints: POINTS_CONFIG.PATROL_MEDIUM },
    { priority: 'low', expectedPoints: POINTS_CONFIG.PATROL_LOW }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    try {
      log(`Testing ${testCase.priority} priority patrol reward...`);
      
      // Get initial points
      const { data: initialProfile } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', patrolUserId)
        .single();
      
      const initialPoints = initialProfile?.points || 0;
      
      // Award patrol points using RPC
      const { error } = await supabase.rpc('award_points', {
        user_id: patrolUserId,
        points_to_award: testCase.expectedPoints,
        reason_text: 'PATROL_RESOLVED',
        report_id: null
      });
      
      if (error) {
        throw new Error(`RPC call failed: ${error.message}`);
      }
      
      // Verify points were added
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', patrolUserId)
        .single();
      
      const newPoints = updatedProfile?.points || 0;
      const actualIncrease = newPoints - initialPoints;
      
      if (actualIncrease !== testCase.expectedPoints) {
        throw new Error(`Points mismatch: expected +${testCase.expectedPoints}, got +${actualIncrease}`);
      }
      
      log(`✅ ${testCase.priority} priority patrol reward passed: +${actualIncrease} points`);
      passed++;
      
    } catch (error) {
      log(`❌ ${testCase.priority} priority patrol reward failed: ${error.message}`, 'error');
      failed++;
    }
  }
  
  log(`Patrol rewards test results: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

async function testReporterRewards(regularUserId) {
  log('👤 Testing Reporter Rewards...');
  
  const testCases = [
    { reason: 'REPORT_VERIFIED', expectedPoints: POINTS_CONFIG.REPORT_VERIFIED },
    { reason: 'REPORT_RESOLVED', expectedPoints: POINTS_CONFIG.REPORT_RESOLVED }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    const success = await testAwardPoints(regularUserId, testCase.reason, testCase.expectedPoints);
    if (success) {
      passed++;
    } else {
      failed++;
    }
  }
  
  log(`Reporter rewards test results: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

async function testDatabaseConsistency(userId) {
  log('🔍 Testing Database Consistency...');
  
  try {
    // Get current state
    const { data: profile } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', userId)
      .single();
    
    const { data: userStats } = await supabase
      .from('user_stats')
      .select('total_points')
      .eq('user_id', userId)
      .single();
    
    const { data: pointsHistory } = await supabase
      .from('points_history')
      .select('points')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    log(`Profile points: ${profile?.points || 0}`);
    log(`User stats points: ${userStats?.total_points || 0}`);
    log(`Recent points history entries: ${pointsHistory?.length || 0}`);
    
    // Check consistency
    if (userStats && profile && profile.points !== userStats.total_points) {
      log(`⚠️ Inconsistency detected: profile has ${profile.points}, user_stats has ${userStats.total_points}`, 'warn');
    }
    
    log('✅ Database consistency check completed');
    return true;
    
  } catch (error) {
    log(`❌ Database consistency test failed: ${error.message}`, 'error');
    return false;
  }
}

async function runRewardsTest() {
  log('🚀 Starting Rewards Distribution Test...');
  
  try {
    // Get test users
    const { regularUser, patrolUser } = await getTestUsers();
    
    // Test reporter rewards
    const reporterResults = await testReporterRewards(regularUser.id);
    
    // Test patrol rewards
    const patrolResults = await testPatrolRewards(patrolUser.id);
    
    // Test database consistency
    await testDatabaseConsistency(regularUser.id);
    await testDatabaseConsistency(patrolUser.id);
    
    // Print summary
    log('\n📊 Test Summary:');
    log('='.repeat(40));
    log(`Reporter Rewards: ${reporterResults.passed} passed, ${reporterResults.failed} failed`);
    log(`Patrol Rewards: ${patrolResults.passed} passed, ${patrolResults.failed} failed`);
    
    const totalPassed = reporterResults.passed + patrolResults.passed;
    const totalFailed = reporterResults.failed + patrolResults.failed;
    const totalTests = totalPassed + totalFailed;
    
    log(`Total: ${totalPassed} passed, ${totalFailed} failed`);
    log(`Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
    
    if (totalFailed === 0) {
      log('🎉 All tests passed! Rewards distribution system is working correctly.');
    } else {
      log('⚠️ Some tests failed. Please check the errors above.');
    }
    
  } catch (error) {
    log(`❌ Test suite failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Run the test
runRewardsTest();
