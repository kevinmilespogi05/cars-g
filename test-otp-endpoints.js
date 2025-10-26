#!/usr/bin/env node

// Test OTP endpoints with proper data
const BASE_URL = 'https://cars-g.vercel.app';

async function testOTPEndpoints() {
  console.log('🧪 Testing OTP endpoints...');
  
  // Test 1: Registration with valid data
  console.log('\n1️⃣ Testing Registration...');
  const registrationData = {
    firstName: 'Test',
    lastName: 'User',
    email: 'testuser@gmail.com',
    username: 'testuser123',
    password: 'testpassword123',
    confirmPassword: 'testpassword123',
    acceptTerms: true
  };
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/register-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registrationData)
    });
    
    console.log(`  Status: ${response.status}`);
    console.log(`  Content-Type: ${response.headers.get('content-type')}`);
    
    const text = await response.text();
    console.log(`  Response: ${text.substring(0, 200)}...`);
    
    if (response.status === 200) {
      try {
        const json = JSON.parse(text);
        console.log(`  ✅ Success:`, json);
        return json;
      } catch (e) {
        console.log(`  ⚠️ Not JSON:`, text);
      }
    }
    
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }
  
  // Test 2: Invalid email domain
  console.log('\n2️⃣ Testing Invalid Email Domain...');
  const invalidEmailData = {
    ...registrationData,
    email: 'testuser@yahoo.com'
  };
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/register-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidEmailData)
    });
    
    console.log(`  Status: ${response.status}`);
    const text = await response.text();
    console.log(`  Response: ${text}`);
    
    if (response.status === 400) {
      try {
        const json = JSON.parse(text);
        console.log(`  ✅ Correctly rejected:`, json);
      } catch (e) {
        console.log(`  ⚠️ Not JSON:`, text);
      }
    }
    
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }
  
  // Test 3: Missing fields
  console.log('\n3️⃣ Testing Missing Fields...');
  const incompleteData = {
    firstName: 'Test'
  };
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/register-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(incompleteData)
    });
    
    console.log(`  Status: ${response.status}`);
    const text = await response.text();
    console.log(`  Response: ${text}`);
    
    if (response.status === 400) {
      try {
        const json = JSON.parse(text);
        console.log(`  ✅ Correctly rejected:`, json);
      } catch (e) {
        console.log(`  ⚠️ Not JSON:`, text);
      }
    }
    
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }
}

testOTPEndpoints();
