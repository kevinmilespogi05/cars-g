// Test script to verify admin API endpoints are working
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001';

async function testAdminAPI() {
  try {
    console.log('🧪 Testing admin API endpoints...');
    
    // Test 1: Check if server is running
    console.log('\n1️⃣ Testing server health...');
    try {
      const healthResponse = await fetch(`${API_BASE}/health`);
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        console.log('✅ Server is running:', healthData);
      } else {
        console.log('❌ Server health check failed');
        return;
      }
    } catch (error) {
      console.log('❌ Server is not running or not accessible');
      console.log('   Make sure to run: cd server && npm run dev');
      return;
    }

    // Test 2: Check verification requests endpoint (without auth for now)
    console.log('\n2️⃣ Testing verification requests endpoint...');
    try {
      const response = await fetch(`${API_BASE}/api/admin/verification-requests`);
      console.log('📊 Response status:', response.status);
      
      if (response.status === 401) {
        console.log('✅ Endpoint exists but requires authentication (expected)');
      } else if (response.status === 200) {
        const data = await response.json();
        console.log('📋 Verification requests:', data);
      } else {
        console.log('⚠️  Unexpected response:', response.status);
      }
    } catch (error) {
      console.log('❌ Error testing verification requests endpoint:', error.message);
    }

    // Test 3: Check if we can query the database directly
    console.log('\n3️⃣ Testing database connection...');
    try {
      const response = await fetch(`${API_BASE}/api/test/chat-messages`);
      if (response.ok) {
        console.log('✅ Database connection is working');
      } else {
        console.log('⚠️  Database connection test failed');
      }
    } catch (error) {
      console.log('❌ Database connection error:', error.message);
    }

    console.log('\n🎯 Next steps:');
    console.log('1. Run the fix script: node fix-verification-requests.js');
    console.log('2. Check the admin dashboard again');
    console.log('3. If still no requests, check the database directly');

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testAdminAPI();
