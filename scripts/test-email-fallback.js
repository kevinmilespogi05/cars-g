#!/usr/bin/env node

/**
 * Test Email Fallback Mode
 * Tests the email verification system with fallback mode enabled
 */

import fetch from 'node-fetch';

async function testEmailFallback() {
  console.log('🧪 Testing Email Verification with Fallback Mode\n');
  console.log('=' .repeat(50));

  const testEmail = 'redniwesley@gmail.com';
  const testUsername = 'Test User';

  try {
    console.log(`📧 Testing email verification for: ${testEmail}`);
    console.log('⏱️  This may take up to 15 seconds due to timeouts...\n');

    const response = await fetch('http://localhost:3001/api/auth/send-verification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail,
        username: testUsername
      })
    });

    const data = await response.json();
    
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Data:');
    console.log(JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('\n✅ Email verification request successful!');
      
      if (data.code) {
        console.log('🔑 Verification code provided in response:', data.code);
        console.log('💡 This means fallback mode is working correctly.');
      } else {
        console.log('📧 Email was sent successfully via email service.');
      }
      
      console.log(`⏰ Code expires at: ${data.expiresAt}`);
      console.log(`🔧 Email service used: ${data.emailService || 'unknown'}`);
      
    } else {
      console.log('\n❌ Email verification request failed');
      console.log('Error:', data.error);
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.log('\n🔧 Make sure your server is running on port 3001');
    console.log('   Run: cd server && node server.js');
  }

  console.log('\n✨ Test completed!');
}

// Run the test
testEmailFallback().catch(console.error);
