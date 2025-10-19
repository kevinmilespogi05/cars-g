/**
 * Fixed Rewards Distribution Test
 * This script tests the rewards system after fixing the award_points function
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mffuqdwqjdxbwpbhuxby.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mZnVxZHdxamR4YndwYmh1eGJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5MTI4NzMsImV4cCI6MjA1OTQ4ODg3M30.3ALtkwlAO-V_98e-Y263l9pYSWjW1h1AY3qhqSTMkW0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
}

async function testSingleReward(userId, reason, expectedPoints, testName) {
  log(`🧪 Testing ${testName}...`);
  
  try {
    // Get initial state
    const { data: initialProfile } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', userId)
      .single();
    
    const { data: initialStats } = await supabase
      .from('user_stats')
      .select('total_points')
      .eq('user_id', userId)
      .single();
    
    const initialProfilePoints = initialProfile?.points || 0;
    const initialStatsPoints = initialStats?.total_points || 0;
    
    log(`Initial profile points: ${initialProfilePoints}`);
    log(`Initial stats points: ${initialStatsPoints}`);
    
    // Award points
    const { data, error } = await supabase.rpc('award_points', {
      user_id: userId,
      points_to_award: expectedPoints,
      reason_text: reason,
      report_id: null
    });
    
    if (error) {
      throw new Error(`RPC call failed: ${error.message}`);
    }
    
    // Check profile points
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', userId)
      .single();
    
    // Check user_stats points
    const { data: updatedStats } = await supabase
      .from('user_stats')
      .select('total_points')
      .eq('user_id', userId)
      .single();
    
    // Check points history
    const { data: pointsHistory } = await supabase
      .from('points_history')
      .select('*')
      .eq('user_id', userId)
      .eq('reason', reason)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    const newProfilePoints = updatedProfile?.points || 0;
    const newStatsPoints = updatedStats?.total_points || 0;
    
    const profileIncrease = newProfilePoints - initialProfilePoints;
    const statsIncrease = newStatsPoints - initialStatsPoints;
    
    log(`New profile points: ${newProfilePoints} (+${profileIncrease})`);
    log(`New stats points: ${newStatsPoints} (+${statsIncrease})`);
    
    // Verify results
    if (profileIncrease !== expectedPoints) {
      throw new Error(`Profile points mismatch: expected +${expectedPoints}, got +${profileIncrease}`);
    }
    
    if (statsIncrease !== expectedPoints) {
      throw new Error(`Stats points mismatch: expected +${expectedPoints}, got +${statsIncrease}`);
    }
    
    if (!pointsHistory) {
      throw new Error('Points history entry not found');
    }
    
    if (pointsHistory.points !== expectedPoints) {
      throw new Error(`Points history mismatch: expected ${expectedPoints}, got ${pointsHistory.points}`);
    }
    
    if (pointsHistory.reason !== reason) {
      throw new Error(`Points history reason mismatch: expected ${reason}, got ${pointsHistory.reason}`);
    }
    
    log(`✅ ${testName} passed: +${expectedPoints} points awarded correctly`);
    return true;
    
  } catch (error) {
    log(`❌ ${testName} failed: ${error.message}`, 'error');
    return false;
  }
}

async function runRewardsTest() {
  log('🚀 Starting Fixed Rewards Distribution Test...');
  
  try {
    // Get test users
    const { data: regularUser } = await supabase
      .from('profiles')
      .select('id, username, role, points')
      .eq('role', 'user')
      .limit(1)
      .single();
    
    const { data: patrolUser } = await supabase
      .from('profiles')
      .select('id, username, role, points')
      .eq('role', 'patrol')
      .limit(1)
      .single();
    
    if (!regularUser || !patrolUser) {
      throw new Error('Test users not found');
    }
    
    log(`Testing with regular user: ${regularUser.username} (${regularUser.id})`);
    log(`Testing with patrol user: ${patrolUser.username} (${patrolUser.id})`);
    
    let passed = 0;
    let failed = 0;
    
    // Test reporter rewards
    log('\n👤 Testing Reporter Rewards...');
    
    const reporterTests = [
      { reason: 'REPORT_VERIFIED', points: 25, name: 'Report Verified Reward' },
      { reason: 'REPORT_RESOLVED', points: 100, name: 'Report Resolved Reward' }
    ];
    
    for (const test of reporterTests) {
      const success = await testSingleReward(regularUser.id, test.reason, test.points, test.name);
      if (success) passed++; else failed++;
    }
    
    // Test patrol rewards
    log('\n🚔 Testing Patrol Officer Rewards...');
    
    const patrolTests = [
      { reason: 'PATROL_RESOLVED', points: 50, name: 'High Priority Patrol Reward' },
      { reason: 'PATROL_RESOLVED', points: 25, name: 'Medium Priority Patrol Reward' },
      { reason: 'PATROL_RESOLVED', points: 10, name: 'Low Priority Patrol Reward' }
    ];
    
    for (const test of patrolTests) {
      const success = await testSingleReward(patrolUser.id, test.reason, test.points, test.name);
      if (success) passed++; else failed++;
    }
    
    // Test database consistency
    log('\n🔍 Testing Database Consistency...');
    
    const { data: finalProfile } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', regularUser.id)
      .single();
    
    const { data: finalStats } = await supabase
      .from('user_stats')
      .select('total_points')
      .eq('user_id', regularUser.id)
      .single();
    
    if (finalProfile && finalStats && finalProfile.points === finalStats.total_points) {
      log('✅ Database consistency verified: profile and stats points match');
      passed++;
    } else {
      log(`❌ Database inconsistency: profile has ${finalProfile?.points}, stats has ${finalStats?.total_points}`, 'error');
      failed++;
    }
    
    // Print summary
    log('\n📊 Test Results Summary:');
    log('='.repeat(50));
    log(`Total Tests: ${passed + failed}`);
    log(`Passed: ${passed}`);
    log(`Failed: ${failed}`);
    log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
    
    if (failed === 0) {
      log('\n🎉 All tests passed! Rewards distribution system is working correctly.');
    } else {
      log('\n⚠️ Some tests failed. Please check the errors above.');
    }
    
  } catch (error) {
    log(`❌ Test suite failed: ${error.message}`, 'error');
  }
}

// Run the test
runRewardsTest();

