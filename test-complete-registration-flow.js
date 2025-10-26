#!/usr/bin/env node

// Test the complete registration to email verification flow
const BASE_URL = 'https://cars-g.vercel.app';

async function testCompleteRegistrationFlow() {
  console.log('🧪 Testing Complete Registration Flow...\n');
  
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
    console.log('1️⃣ Testing Registration...');
    const registrationResponse = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registrationData)
    });
    
    const registrationResult = await registrationResponse.json();
    console.log(`Registration Status: ${registrationResponse.status}`);
    console.log('Registration Response:', JSON.stringify(registrationResult, null, 2));
    
    if (registrationResult.success) {
      console.log('✅ Registration successful!');
      console.log('📧 Email sent:', registrationResult.data.emailSent);
      console.log('📊 Status:', registrationResult.data.verificationStatus);
      console.log('🔄 Next step:', registrationResult.data.nextStep);
      console.log('🔗 Redirect URL:', registrationResult.data.redirectUrl);
      
      if (registrationResult.data.redirectUrl) {
        console.log('\n🎯 Frontend should redirect to:', registrationResult.data.redirectUrl);
        console.log('📱 This is the email verification page where users enter their OTP code');
        
        // Test the email verification page exists
        console.log('\n2️⃣ Testing Email Verification Page...');
        const verifyPageResponse = await fetch(`${BASE_URL}/verify-email`);
        console.log(`Verify Page Status: ${verifyPageResponse.status}`);
        
        if (verifyPageResponse.status === 200) {
          console.log('✅ Email verification page is accessible');
        } else {
          console.log('❌ Email verification page not found');
        }
      }
    } else {
      console.log('❌ Registration failed:', registrationResult.error);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testCompleteRegistrationFlow();
