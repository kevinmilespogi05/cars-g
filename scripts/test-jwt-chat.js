#!/usr/bin/env node

/**
 * JWT Chat Test Script
 * Tests JWT authentication for chat functionality
 */

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';

async function testJWTChatAuthentication() {
  console.log('🧪 Testing JWT Chat Authentication...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing server health...');
    const healthResponse = await fetch(`${API_BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Server is healthy:', healthData.status);

    // Test 2: Test JWT login
    console.log('\n2. Testing JWT login...');
    try {
      const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'testpassword'
        })
      });
      
      const loginData = await loginResponse.json();
      
      if (loginResponse.ok) {
        console.log('✅ JWT Login successful:', loginData.user.email);
        console.log('🔑 Access token received:', loginData.tokens.accessToken ? 'Yes' : 'No');
        
        // Test 3: Test JWT token validation
        console.log('\n3. Testing JWT token validation...');
        const tokenResponse = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${loginData.tokens.accessToken}`,
            'Content-Type': 'application/json',
          }
        });
        
        const tokenData = await tokenResponse.json();
        
        if (tokenResponse.ok) {
          console.log('✅ JWT token validation successful:', tokenData.user.username);
        } else {
          console.log('❌ JWT token validation failed:', tokenData.error);
        }
        
        // Test 4: Test socket connection (simulate)
        console.log('\n4. Testing socket connection simulation...');
        console.log('📡 Socket connection would use JWT token for authentication');
        console.log('🔑 Token available for socket auth:', !!loginData.tokens.accessToken);
        
      } else {
        console.log('❌ JWT Login failed (expected without valid credentials):', loginData.error);
        console.log('💡 This is expected - you need valid user credentials to test JWT');
      }
      
    } catch (loginError) {
      console.log('❌ Login request failed:', loginError.message);
    }

    console.log('\n🎉 JWT Chat Authentication tests completed!');
    console.log('\n📝 Note: To test with real credentials:');
    console.log('   1. Create a user account');
    console.log('   2. Update the email/password in this script');
    console.log('   3. Run the test again');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('💡 Make sure the server is running on', API_BASE_URL);
  }
}

// Run the tests
testJWTChatAuthentication();
