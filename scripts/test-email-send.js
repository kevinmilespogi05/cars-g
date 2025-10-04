#!/usr/bin/env node

/**
 * Test Email Sending Script
 * This script actually attempts to send a test email to verify the service works
 */

import dotenv from 'dotenv';
import GmailEmailService from '../server/lib/gmailEmailService.js';

// Load environment variables
dotenv.config();

async function testEmailSending() {
  console.log('🧪 Testing Email Sending...\n');

  const gmailService = new GmailEmailService();
  
  console.log('📧 Attempting to send test email...');
  
  try {
    const result = await gmailService.sendVerificationEmail(
      'cars.gsanpablo@gmail.com',
      '123456',
      'Test User'
    );
    
    if (result) {
      console.log('✅ Test email sent successfully!');
      console.log('📧 Check your email inbox for the verification code');
    } else {
      console.log('❌ Failed to send test email');
    }
  } catch (error) {
    console.error('❌ Error sending test email:', error.message);
  }
}

// Run the test
testEmailSending().catch(console.error);
