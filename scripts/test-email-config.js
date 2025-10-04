#!/usr/bin/env node

/**
 * Test Email Configuration Script
 * This script helps you test if your email services are properly configured
 */

import dotenv from 'dotenv';
import EmailService from '../server/lib/emailService.js';
import GmailEmailService from '../server/lib/gmailEmailService.js';

// Load environment variables
dotenv.config();

async function testEmailConfiguration() {
  console.log('🧪 Testing Email Configuration...\n');

  // Test Gmail Configuration
  console.log('📧 Testing Gmail Configuration:');
  const gmailService = new GmailEmailService();
  const gmailConfigured = await gmailService.testConfiguration();
  
  if (gmailConfigured) {
    console.log('✅ Gmail is properly configured and ready to send emails\n');
  } else {
    console.log('❌ Gmail is not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD\n');
  }

  // Test Brevo Configuration
  console.log('📧 Testing Brevo Configuration:');
  const brevoService = new EmailService();
  
  if (brevoService.apiKey && brevoService.apiKey !== 'your_brevo_api_key_here') {
    console.log('✅ Brevo API key is configured');
    console.log(`   Sender: ${brevoService.senderEmail}`);
  } else {
    console.log('❌ Brevo is not configured. Please set BREVO_API_KEY');
  }

  console.log('\n📋 Configuration Summary:');
  console.log(`   Gmail: ${gmailConfigured ? '✅ Ready' : '❌ Not configured'}`);
  console.log(`   Brevo: ${brevoService.apiKey && brevoService.apiKey !== 'your_brevo_api_key_here' ? '✅ Ready' : '❌ Not configured'}`);

  if (!gmailConfigured && (!brevoService.apiKey || brevoService.apiKey === 'your_brevo_api_key_here')) {
    console.log('\n⚠️  No email services are configured!');
    console.log('   Email verification will not work on the deployed system.');
    console.log('\n🔧 To fix this:');
    console.log('   1. Set up Gmail SMTP (recommended) or Brevo API');
    console.log('   2. Update environment variables in Render dashboard');
    console.log('   3. Redeploy the backend service');
  } else {
    console.log('\n✅ At least one email service is configured!');
    console.log('   Email verification should work on the deployed system.');
  }
}

// Run the test
testEmailConfiguration().catch(console.error);
