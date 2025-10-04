#!/usr/bin/env node

/**
 * Test Email Verification Endpoints
 * Tests the fixed verification endpoints with various scenarios
 */

import fetch from 'node-fetch';

const API_BASE = process.env.API_BASE || 'http://localhost:3001';

async function testVerificationEndpoints() {
  console.log('🧪 Testing Email Verification Endpoints\n');
  console.log('=' .repeat(50));

  const testCases = [
    {
      name: 'Valid send verification request',
      endpoint: '/api/auth/send-verification',
      method: 'POST',
      body: { email: 'test@example.com', username: 'Test User' },
      expectedStatus: 200
    },
    {
      name: 'Invalid JSON in send verification',
      endpoint: '/api/auth/send-verification',
      method: 'POST',
      body: 'invalid json',
      expectedStatus: 400
    },
    {
      name: 'Empty body in send verification',
      endpoint: '/api/auth/send-verification',
      method: 'POST',
      body: '',
      expectedStatus: 400
    },
    {
      name: 'Missing email in send verification',
      endpoint: '/api/auth/send-verification',
      method: 'POST',
      body: { username: 'Test User' },
      expectedStatus: 400
    },
    {
      name: 'Valid verify email request',
      endpoint: '/api/auth/verify-email',
      method: 'POST',
      body: { email: 'test@example.com', code: '123456' },
      expectedStatus: 400 // Will fail because code doesn't exist
    },
    {
      name: 'Invalid JSON in verify email',
      endpoint: '/api/auth/verify-email',
      method: 'POST',
      body: 'invalid json',
      expectedStatus: 400
    },
    {
      name: 'Empty body in verify email',
      endpoint: '/api/auth/verify-email',
      method: 'POST',
      body: '',
      expectedStatus: 400
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 Testing: ${testCase.name}`);
    console.log('-'.repeat(30));

    try {
      const options = {
        method: testCase.method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (testCase.body) {
        if (typeof testCase.body === 'string') {
          options.body = testCase.body;
        } else {
          options.body = JSON.stringify(testCase.body);
        }
      }

      const response = await fetch(`${API_BASE}${testCase.endpoint}`, options);
      const data = await response.json().catch(() => ({}));

      console.log(`   Status: ${response.status}`);
      console.log(`   Success: ${data.success || false}`);
      console.log(`   Error: ${data.error || 'None'}`);
      console.log(`   Code: ${data.code || 'None'}`);

      if (response.status === testCase.expectedStatus) {
        console.log('   ✅ Test passed');
      } else {
        console.log(`   ❌ Test failed - expected ${testCase.expectedStatus}, got ${response.status}`);
      }

    } catch (error) {
      console.log(`   ❌ Test failed with error: ${error.message}`);
    }
  }

  console.log('\n✨ Testing complete!');
  console.log('\n📝 Notes:');
  console.log('- Email verification codes are logged to console in development mode');
  console.log('- Invalid JSON requests now return proper error responses');
  console.log('- Empty request bodies are handled gracefully');
  console.log('- The server should not crash on malformed requests');
}

// Run the tests
testVerificationEndpoints().catch(console.error);
