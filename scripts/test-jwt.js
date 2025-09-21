#!/usr/bin/env node

/**
 * JWT Test Script
 * Tests the JWT authentication endpoints
 */

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';

async function testJWTAuthentication() {
  console.log('🧪 Testing JWT Authentication...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing server health...');
    const healthResponse = await fetch(`${API_BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Server is healthy:', healthData.status);

    // Test 2: Test login endpoint (this will fail without valid credentials)
    console.log('\n2. Testing login endpoint...');
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
        console.log('✅ Login successful:', loginData.user.email);
        console.log('🔑 Access token received:', loginData.tokens.accessToken ? 'Yes' : 'No');
        console.log('🔄 Refresh token received:', loginData.tokens.refreshToken ? 'Yes' : 'No');
        
        // Test 3: Test protected endpoint
        console.log('\n3. Testing protected endpoint...');
        const protectedResponse = await fetch(`${API_BASE_URL}/api/auth/test`, {
          headers: {
            'Authorization': `Bearer ${loginData.tokens.accessToken}`,
            'Content-Type': 'application/json',
          }
        });
        
        const protectedData = await protectedResponse.json();
        
        if (protectedResponse.ok) {
          console.log('✅ Protected endpoint accessible:', protectedData.message);
          console.log('👤 User info:', protectedData.user);
        } else {
          console.log('❌ Protected endpoint failed:', protectedData.error);
        }
        
        // Test 4: Test token refresh
        console.log('\n4. Testing token refresh...');
        const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            refreshToken: loginData.tokens.refreshToken
          })
        });
        
        const refreshData = await refreshResponse.json();
        
        if (refreshResponse.ok) {
          console.log('✅ Token refresh successful');
          console.log('🔑 New access token received:', refreshData.tokens.accessToken ? 'Yes' : 'No');
        } else {
          console.log('❌ Token refresh failed:', refreshData.error);
        }
        
        // Test 5: Test logout
        console.log('\n5. Testing logout...');
        const logoutResponse = await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${loginData.tokens.accessToken}`,
            'Content-Type': 'application/json',
          }
        });
        
        const logoutData = await logoutResponse.json();
        
        if (logoutResponse.ok) {
          console.log('✅ Logout successful:', logoutData.message);
        } else {
          console.log('❌ Logout failed:', logoutData.error);
        }
        
      } else {
        console.log('❌ Login failed (expected without valid credentials):', loginData.error);
      }
      
    } catch (loginError) {
      console.log('❌ Login request failed:', loginError.message);
    }

    // Test 6: Test without authentication
    console.log('\n6. Testing protected endpoint without authentication...');
    const unauthResponse = await fetch(`${API_BASE_URL}/api/auth/test`);
    const unauthData = await unauthResponse.json();
    
    if (unauthResponse.status === 401) {
      console.log('✅ Unauthenticated request properly rejected:', unauthData.error);
    } else {
      console.log('❌ Unauthenticated request should have been rejected');
    }

    console.log('\n🎉 JWT Authentication tests completed!');
    console.log('\n📝 Note: To test with real credentials, update the email/password in this script.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('💡 Make sure the server is running on', API_BASE_URL);
  }
}

// Run the tests
testJWTAuthentication();
