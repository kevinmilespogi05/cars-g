#!/usr/bin/env node

// Quick deployment test for OTP registration system
// Tests if all endpoints are accessible and responding

const BASE_URL = process.env.TEST_BASE_URL || 'https://cars-g.vercel.app';

// Test endpoints
const endpoints = [
  { path: '/api/auth/register-otp', method: 'POST', name: 'Registration' },
  { path: '/api/auth/verify-otp', method: 'POST', name: 'OTP Verification' },
  { path: '/api/auth/resend-otp', method: 'POST', name: 'Resend OTP' }
];

// Helper function to test endpoint
async function testEndpoint(endpoint) {
  const url = `${BASE_URL}${endpoint.path}`;
  
  try {
    const response = await fetch(url, {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}) // Empty body to test endpoint accessibility
    });
    
    return {
      name: endpoint.name,
      path: endpoint.path,
      status: response.status,
      accessible: response.status !== 404,
      error: null
    };
  } catch (error) {
    return {
      name: endpoint.name,
      path: endpoint.path,
      status: 0,
      accessible: false,
      error: error.message
    };
  }
}

// Test all endpoints
async function testDeployment() {
  console.log('🚀 Testing OTP Registration System Deployment...\n');
  console.log(`🌐 Testing against: ${BASE_URL}\n`);
  
  const results = [];
  
  for (const endpoint of endpoints) {
    console.log(`🧪 Testing ${endpoint.name}...`);
    const result = await testEndpoint(endpoint);
    results.push(result);
    
    if (result.accessible) {
      console.log(`✅ ${endpoint.name} is accessible (Status: ${result.status})`);
    } else {
      console.log(`❌ ${endpoint.name} is not accessible (Error: ${result.error})`);
    }
    console.log('');
  }
  
  // Summary
  const accessibleCount = results.filter(r => r.accessible).length;
  const totalCount = results.length;
  
  console.log('📊 Deployment Test Results:');
  console.log(`✅ Accessible: ${accessibleCount}/${totalCount}`);
  console.log(`❌ Not Accessible: ${totalCount - accessibleCount}/${totalCount}`);
  
  if (accessibleCount === totalCount) {
    console.log('🎉 All endpoints are accessible! The system is deployed correctly.');
  } else {
    console.log('⚠️ Some endpoints are not accessible. Please check your deployment.');
  }
  
  console.log('\n📋 Detailed Results:');
  results.forEach(result => {
    console.log(`  ${result.accessible ? '✅' : '❌'} ${result.name}: ${result.path} (Status: ${result.status})`);
  });
  
  console.log('\n🔧 Next Steps:');
  console.log('1. Run the full test suite: node run-tests.js');
  console.log('2. Follow the manual testing guide: MANUAL_TESTING_GUIDE.md');
  console.log('3. Check your environment variables are set correctly');
  console.log('4. Verify database migration has been applied');
}

// Run deployment test
testDeployment().catch(console.error);
