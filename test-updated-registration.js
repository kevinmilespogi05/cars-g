#!/usr/bin/env node

// Test the updated registration endpoint
const BASE_URL = 'https://cars-g.vercel.app';

async function testUpdatedRegistration() {
  console.log('🧪 Testing Updated Registration Endpoint...\n');
  
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
    
    const result = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ Registration successful!');
      console.log('📧 Email sent:', result.data.emailSent);
      console.log('📊 Status:', result.data.verificationStatus);
      console.log('🔄 Next step:', result.data.nextStep);
      console.log('🔗 Redirect URL:', result.data.redirectUrl);
      
      if (result.data.redirectUrl) {
        console.log('\n🎯 Frontend should redirect to:', result.data.redirectUrl);
        console.log('📱 This is the email verification page where users enter their OTP code');
      }
    } else {
      console.log('❌ Registration failed:', result.error);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testUpdatedRegistration();
