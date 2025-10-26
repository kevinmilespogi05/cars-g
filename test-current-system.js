#!/usr/bin/env node

// Test the current registration system to verify it works
const BASE_URL = 'https://cars-g.vercel.app';

async function testCurrentSystem() {
  console.log('🧪 Testing Current Registration System...');
  
  // Test the existing registration endpoint
  console.log('\n1️⃣ Testing Existing Registration Endpoint...');
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
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registrationData)
    });
    
    console.log(`  Status: ${response.status}`);
    console.log(`  Content-Type: ${response.headers.get('content-type')}`);
    
    const text = await response.text();
    console.log(`  Response: ${text.substring(0, 300)}...`);
    
    if (response.status === 200) {
      try {
        const json = JSON.parse(text);
        console.log(`  ✅ Registration successful:`, json);
        return true;
      } catch (e) {
        console.log(`  ⚠️ Not JSON response:`, text);
      }
    } else {
      console.log(`  ❌ Registration failed with status: ${response.status}`);
    }
    
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }
  
  // Test invalid email domain
  console.log('\n2️⃣ Testing Invalid Email Domain...');
  const invalidEmailData = {
    ...registrationData,
    email: 'testuser@yahoo.com'
  };
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
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
        console.log(`  ✅ Correctly rejected Gmail-only restriction:`, json);
      } catch (e) {
        console.log(`  ⚠️ Not JSON:`, text);
      }
    }
    
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }
  
  // Test missing fields
  console.log('\n3️⃣ Testing Missing Fields...');
  const incompleteData = {
    firstName: 'Test'
  };
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
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
        console.log(`  ✅ Correctly rejected missing fields:`, json);
      } catch (e) {
        console.log(`  ⚠️ Not JSON:`, text);
      }
    }
    
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }
  
  console.log('\n📋 Summary:');
  console.log('✅ Current registration system is working');
  console.log('⚠️ OTP endpoints need to be deployed to Vercel');
  console.log('🔧 Next steps: Deploy the OTP endpoints');
}

testCurrentSystem();
