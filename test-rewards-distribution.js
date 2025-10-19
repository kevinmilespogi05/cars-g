/**
 * Comprehensive Test Suite for Rewards Distribution System
 * Tests both user reporter rewards and patrol officer rewards
 */

import { createClient } from '@supabase/supabase-js';
import { awardPoints, awardCustomPoints, getPointsHistory } from './src/lib/points.js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Test configuration
const TEST_CONFIG = {
  // Test user IDs (replace with actual test user IDs)
  TEST_REPORTER_USER_ID: 'test-reporter-user-id',
  TEST_PATROL_USER_ID: 'test-patrol-user-id',
  TEST_ADMIN_USER_ID: 'test-admin-user-id',
  
  // Expected points values
  EXPECTED_POINTS: {
    REPORT_VERIFIED: 25,
    REPORT_RESOLVED: 100,
    PATROL_HIGH: 50,
    PATROL_MEDIUM: 25,
    PATROL_LOW: 10,
    DAILY_LOGIN: 5,
    PROFILE_COMPLETED: 25
  }
};

// Test utilities
class RewardsTestSuite {
  constructor() {
    this.testResults = [];
    this.testData = {
      initialProfiles: {},
      initialUserStats: {},
      initialPointsHistory: []
    };
  }

  async log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
  }

  async captureInitialState(userIds) {
    this.log('Capturing initial state for test users...');
    
    for (const userId of userIds) {
      // Capture profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profile) {
        this.testData.initialProfiles[userId] = profile;
      }

      // Capture user_stats data
      const { data: userStats } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (userStats) {
        this.testData.initialUserStats[userId] = userStats;
      }

      // Capture points history count
      const { count: pointsHistoryCount } = await supabase
        .from('points_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      this.testData.initialPointsHistory[userId] = pointsHistoryCount || 0;
    }
  }

  async verifyProfileUpdate(userId, expectedPointsIncrease) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', userId)
      .single();

    if (!profile) {
      throw new Error(`Profile not found for user ${userId}`);
    }

    const initialPoints = this.testData.initialProfiles[userId]?.points || 0;
    const actualIncrease = profile.points - initialPoints;
    
    if (actualIncrease !== expectedPointsIncrease) {
      throw new Error(
        `Profile points mismatch: expected +${expectedPointsIncrease}, got +${actualIncrease}`
      );
    }

    this.log(`✓ Profile points updated correctly: +${actualIncrease}`);
    return true;
  }

  async verifyUserStatsUpdate(userId, expectedPointsIncrease) {
    const { data: userStats } = await supabase
      .from('user_stats')
      .select('total_points')
      .eq('user_id', userId)
      .single();

    if (!userStats) {
      this.log('⚠ User stats not found, creating new record...', 'warn');
      return true; // This is handled by the award_points function
    }

    const initialPoints = this.testData.initialUserStats[userId]?.total_points || 0;
    const actualIncrease = userStats.total_points - initialPoints;
    
    if (actualIncrease !== expectedPointsIncrease) {
      throw new Error(
        `User stats points mismatch: expected +${expectedPointsIncrease}, got +${actualIncrease}`
      );
    }

    this.log(`✓ User stats points updated correctly: +${actualIncrease}`);
    return true;
  }

  async verifyPointsHistory(userId, expectedReason, expectedPoints) {
    const { data: pointsHistory } = await supabase
      .from('points_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!pointsHistory) {
      throw new Error(`Points history entry not found for user ${userId}`);
    }

    if (pointsHistory.reason !== expectedReason) {
      throw new Error(
        `Points history reason mismatch: expected ${expectedReason}, got ${pointsHistory.reason}`
      );
    }

    if (pointsHistory.points !== expectedPoints) {
      throw new Error(
        `Points history points mismatch: expected ${expectedPoints}, got ${pointsHistory.points}`
      );
    }

    this.log(`✓ Points history recorded correctly: ${expectedReason} (+${expectedPoints})`);
    return true;
  }

  async testReporterRewards() {
    this.log('🧪 Testing Reporter Rewards...');
    
    const testCases = [
      {
        name: 'REPORT_VERIFIED reward',
        reason: 'REPORT_VERIFIED',
        expectedPoints: TEST_CONFIG.EXPECTED_POINTS.REPORT_VERIFIED,
        userId: TEST_CONFIG.TEST_REPORTER_USER_ID
      },
      {
        name: 'REPORT_RESOLVED reward',
        reason: 'REPORT_RESOLVED',
        expectedPoints: TEST_CONFIG.EXPECTED_POINTS.REPORT_RESOLVED,
        userId: TEST_CONFIG.TEST_REPORTER_USER_ID
      }
    ];

    for (const testCase of testCases) {
      try {
        this.log(`Testing ${testCase.name}...`);
        
        // Award points
        const pointsAwarded = await awardPoints(
          testCase.userId,
          testCase.reason,
          'test-report-id'
        );

        // Verify points were awarded correctly
        if (pointsAwarded !== testCase.expectedPoints) {
          throw new Error(`Points awarded mismatch: expected ${testCase.expectedPoints}, got ${pointsAwarded}`);
        }

        // Verify database updates
        await this.verifyProfileUpdate(testCase.userId, testCase.expectedPoints);
        await this.verifyUserStatsUpdate(testCase.userId, testCase.expectedPoints);
        await this.verifyPointsHistory(testCase.userId, testCase.reason, testCase.expectedPoints);

        this.log(`✅ ${testCase.name} passed`);
        this.testResults.push({ test: testCase.name, status: 'PASSED' });

      } catch (error) {
        this.log(`❌ ${testCase.name} failed: ${error.message}`, 'error');
        this.testResults.push({ test: testCase.name, status: 'FAILED', error: error.message });
      }
    }
  }

  async testPatrolRewards() {
    this.log('🧪 Testing Patrol Officer Rewards...');
    
    const testCases = [
      {
        name: 'High priority patrol reward',
        priority: 'high',
        expectedPoints: TEST_CONFIG.EXPECTED_POINTS.PATROL_HIGH,
        userId: TEST_CONFIG.TEST_PATROL_USER_ID
      },
      {
        name: 'Medium priority patrol reward',
        priority: 'medium',
        expectedPoints: TEST_CONFIG.EXPECTED_POINTS.PATROL_MEDIUM,
        userId: TEST_CONFIG.TEST_PATROL_USER_ID
      },
      {
        name: 'Low priority patrol reward',
        priority: 'low',
        expectedPoints: TEST_CONFIG.EXPECTED_POINTS.PATROL_LOW,
        userId: TEST_CONFIG.TEST_PATROL_USER_ID
      }
    ];

    for (const testCase of testCases) {
      try {
        this.log(`Testing ${testCase.name}...`);
        
        // Award custom points (simulating patrol reward)
        const pointsAwarded = await awardCustomPoints(
          testCase.userId,
          testCase.expectedPoints,
          'PATROL_RESOLVED'
        );

        // Verify points were awarded correctly
        if (pointsAwarded !== testCase.expectedPoints) {
          throw new Error(`Points awarded mismatch: expected ${testCase.expectedPoints}, got ${pointsAwarded}`);
        }

        // Verify database updates
        await this.verifyProfileUpdate(testCase.userId, testCase.expectedPoints);
        await this.verifyUserStatsUpdate(testCase.userId, testCase.expectedPoints);
        await this.verifyPointsHistory(testCase.userId, 'PATROL_RESOLVED', testCase.expectedPoints);

        this.log(`✅ ${testCase.name} passed`);
        this.testResults.push({ test: testCase.name, status: 'PASSED' });

      } catch (error) {
        this.log(`❌ ${testCase.name} failed: ${error.message}`, 'error');
        this.testResults.push({ test: testCase.name, status: 'FAILED', error: error.message });
      }
    }
  }

  async testEdgeCases() {
    this.log('🧪 Testing Edge Cases...');
    
    const edgeCases = [
      {
        name: 'Invalid user ID',
        test: async () => {
          try {
            await awardPoints('invalid-user-id', 'REPORT_VERIFIED');
            throw new Error('Should have thrown an error for invalid user ID');
          } catch (error) {
            if (error.message.includes('User profile not found')) {
              return true;
            }
            throw error;
          }
        }
      },
      {
        name: 'Zero points award',
        test: async () => {
          const pointsAwarded = await awardPoints(
            TEST_CONFIG.TEST_REPORTER_USER_ID,
            'REPORT_SUBMITTED' // This should award 0 points
          );
          return pointsAwarded === 0;
        }
      },
      {
        name: 'Negative points (should be prevented)',
        test: async () => {
          try {
            await awardCustomPoints(
              TEST_CONFIG.TEST_REPORTER_USER_ID,
              -10,
              'TEST_NEGATIVE'
            );
            throw new Error('Should have prevented negative points');
          } catch (error) {
            return true; // Expected to fail
          }
        }
      }
    ];

    for (const edgeCase of edgeCases) {
      try {
        this.log(`Testing ${edgeCase.name}...`);
        const result = await edgeCase.test();
        
        if (result) {
          this.log(`✅ ${edgeCase.name} passed`);
          this.testResults.push({ test: edgeCase.name, status: 'PASSED' });
        } else {
          throw new Error('Edge case test returned false');
        }
      } catch (error) {
        this.log(`❌ ${edgeCase.name} failed: ${error.message}`, 'error');
        this.testResults.push({ test: edgeCase.name, status: 'FAILED', error: error.message });
      }
    }
  }

  async testDatabaseConsistency() {
    this.log('🧪 Testing Database Consistency...');
    
    try {
      // Test that all three tables are updated consistently
      const userId = TEST_CONFIG.TEST_REPORTER_USER_ID;
      const testPoints = 50;
      
      // Award points
      await awardCustomPoints(userId, testPoints, 'CONSISTENCY_TEST');
      
      // Check profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', userId)
        .single();
      
      // Check user_stats
      const { data: userStats } = await supabase
        .from('user_stats')
        .select('total_points')
        .eq('user_id', userId)
        .single();
      
      // Check points_history
      const { data: pointsHistory } = await supabase
        .from('points_history')
        .select('points')
        .eq('user_id', userId)
        .eq('reason', 'CONSISTENCY_TEST')
        .single();
      
      if (!profile || !pointsHistory) {
        throw new Error('Missing data in profile or points_history');
      }
      
      // Verify consistency
      const profilePoints = profile.points;
      const userStatsPoints = userStats?.total_points || 0;
      const historyPoints = pointsHistory.points;
      
      if (userStats && profilePoints !== userStatsPoints) {
        throw new Error(`Profile points (${profilePoints}) don't match user_stats (${userStatsPoints})`);
      }
      
      if (historyPoints !== testPoints) {
        throw new Error(`Points history doesn't match awarded points: ${historyPoints} vs ${testPoints}`);
      }
      
      this.log('✅ Database consistency test passed');
      this.testResults.push({ test: 'Database Consistency', status: 'PASSED' });
      
    } catch (error) {
      this.log(`❌ Database consistency test failed: ${error.message}`, 'error');
      this.testResults.push({ test: 'Database Consistency', status: 'FAILED', error: error.message });
    }
  }

  async runAllTests() {
    this.log('🚀 Starting Rewards Distribution Test Suite...');
    
    const testUserIds = [
      TEST_CONFIG.TEST_REPORTER_USER_ID,
      TEST_CONFIG.TEST_PATROL_USER_ID
    ];
    
    // Capture initial state
    await this.captureInitialState(testUserIds);
    
    // Run all tests
    await this.testReporterRewards();
    await this.testPatrolRewards();
    await this.testEdgeCases();
    await this.testDatabaseConsistency();
    
    // Print results
    this.printResults();
  }

  printResults() {
    this.log('\n📊 Test Results Summary:');
    this.log('='.repeat(50));
    
    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    const total = this.testResults.length;
    
    this.log(`Total Tests: ${total}`);
    this.log(`Passed: ${passed}`);
    this.log(`Failed: ${failed}`);
    this.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      this.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => r.status === 'FAILED')
        .forEach(result => {
          this.log(`  - ${result.test}: ${result.error}`);
        });
    }
    
    this.log('\n' + '='.repeat(50));
  }
}

// Main execution
async function main() {
  const testSuite = new RewardsTestSuite();
  
  // Check if we have the required environment variables
  if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
    console.error('❌ Missing required environment variables:');
    console.error('  - VITE_SUPABASE_URL');
    console.error('  - VITE_SUPABASE_ANON_KEY');
    console.error('\nPlease set these environment variables and try again.');
    process.exit(1);
  }
  
  // Check if test user IDs are configured
  if (TEST_CONFIG.TEST_REPORTER_USER_ID === 'test-reporter-user-id' || 
      TEST_CONFIG.TEST_PATROL_USER_ID === 'test-patrol-user-id') {
    console.error('❌ Test user IDs not configured:');
    console.error('Please update TEST_CONFIG with actual user IDs from your database.');
    console.error('\nTo get user IDs, run:');
    console.error('  SELECT id, username FROM profiles WHERE role IN (\'user\', \'patrol\') LIMIT 2;');
    process.exit(1);
  }
  
  try {
    await testSuite.runAllTests();
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { RewardsTestSuite, TEST_CONFIG };

