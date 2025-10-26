#!/usr/bin/env node

// Simple test to check if the server is working
const BASE_URL = 'http://localhost:3001';

async function simpleTest() {
  console.log('🧪 Simple Server Test...\n');
  
  // Test 1: Basic connectivity
  console.log('1️⃣ Testing basic connectivity...');
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    console.log(`Status: ${response.status}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);
    
    const text = await response.text();
    console.log('Response:', text);
    
    if (response.status === 200) {
      console.log('✅ Server is responding correctly!');
    } else {
      console.log('❌ Server returned error status');
    }
    
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    console.log('🔧 Make sure the server is running: node dev-server.js');
  }
  
  // Test 2: Registration endpoint
  console.log('\n2️⃣ Testing registration endpoint...');
  try {
    const response = await fetch(`${BASE_URL}/api/auth/register-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: 'Test',
        lastName: 'User',
        email: 'testuser@gmail.com',
        username: 'testuser123',
        password: 'testpassword123',
        confirmPassword: 'testpassword123',
        acceptTerms: true
      })
    });
    
    console.log(`Status: ${response.status}`);
    const text = await response.text();
    console.log('Response:', text.substring(0, 200));
    
    if (response.status === 200 || response.status === 400) {
      console.log('✅ Registration endpoint is working!');
    } else {
      console.log('❌ Registration endpoint error');
    }
    
  } catch (error) {
    console.log('❌ Registration test failed:', error.message);
  }
}

simpleTest();
