#!/usr/bin/env node

// Test existing endpoints to see what's available
const BASE_URL = 'https://cars-g.vercel.app';

async function testExistingEndpoints() {
  console.log('🧪 Testing existing endpoints...');
  
  const endpoints = [
    '/api/auth/register',
    '/api/auth/verify-email',
    '/api/admin/verification-requests',
    '/api/admin/verify-user'
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n🔍 Testing ${endpoint}...`);
    
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });
      
      console.log(`  Status: ${response.status}`);
      console.log(`  Content-Type: ${response.headers.get('content-type')}`);
      
      if (response.status === 200) {
        const text = await response.text();
        try {
          const json = JSON.parse(text);
          console.log(`  ✅ JSON Response:`, json);
        } catch (e) {
          console.log(`  ⚠️ Non-JSON Response:`, text.substring(0, 100));
        }
      } else {
        console.log(`  ❌ Error status: ${response.status}`);
      }
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }
}

testExistingEndpoints();
