#!/usr/bin/env node

/**
 * Test Resend Email Service Script
 * This script tests the Resend email service with the actual API key
 */

import dotenv from 'dotenv';
import ResendEmailService from '../server/lib/resendEmailService.js';

// Load environment variables
dotenv.config();

// Override with the actual API key for testing
process.env.RESEND_API_KEY = 're_iaQYnUfA_5YiVEyk9SeJiGhtdrj3xQ8SF';
process.env.RESEND_FROM_EMAIL = 'Cars-G <noreply@cars-g.com>';

async function testResendService() {
  console.log('🧪 Testing Resend Email Service...\n');

  const resendService = new ResendEmailService();
  
  // Test configuration first
  console.log('📧 Testing Resend Configuration:');
  const configTest = await resendService.testConfiguration();
  
  if (!configTest) {
    console.log('❌ Resend configuration failed');
    return;
  }

  console.log('\n📧 Attempting to send test email...');
  
  try {
    const result = await resendService.sendVerificationEmail(
      'cars.gsanpablo@gmail.com',
      '123456',
      'Test User'
    );
    
    if (result) {
      console.log('✅ Test email sent successfully via Resend!');
      console.log('📧 Check your email inbox for the verification code');
      console.log('📧 Email should be from: Cars-G <noreply@cars-g.com>');
    } else {
      console.log('❌ Failed to send test email via Resend');
    }
  } catch (error) {
    console.error('❌ Error sending test email via Resend:', error.message);
  }
}

// Run the test
testResendService().catch(console.error);
