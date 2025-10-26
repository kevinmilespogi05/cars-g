#!/usr/bin/env node

// Test a single endpoint to debug the issue
const BASE_URL = 'https://cars-g.vercel.app';

async function testSingleEndpoint() {
  console.log('🧪 Testing single endpoint...');
  
  const testData = {
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
      body: JSON.stringify(testData)
    });
    
    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log('Response body:', text);
    
    try {
      const json = JSON.parse(text);
      console.log('Parsed JSON:', json);
    } catch (e) {
      console.log('Not valid JSON, raw text:', text);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testSingleEndpoint();
