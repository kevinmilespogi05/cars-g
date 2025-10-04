#!/usr/bin/env node

/**
 * Complete Email Service Testing Script
 * Tests both Gmail and Brevo email services with comprehensive error handling
 */

import dotenv from 'dotenv';
import GmailEmailService from '../server/lib/gmailEmailService.js';
import EmailService from '../server/lib/emailService.js';

// Load environment variables
dotenv.config();

async function testEmailServices() {
  console.log('🧪 Complete Email Service Testing\n');
  console.log('=' .repeat(50));

  // Test Gmail Configuration
  console.log('\n📧 Testing Gmail Configuration:');
  console.log('-'.repeat(30));
  
  const gmailService = new GmailEmailService();
  const gmailConfigured = await gmailService.testConfiguration();
  
  if (gmailConfigured) {
    console.log('✅ Gmail is properly configured and ready to send emails');
    
    // Test actual email sending (optional)
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    console.log(`\n📤 Testing Gmail email sending to: ${testEmail}`);
    try {
      const gmailResult = await gmailService.sendVerificationEmail(testEmail, '123456', 'Test User');
      console.log(`   Result: ${gmailResult ? '✅ Success' : '❌ Failed'}`);
    } catch (error) {
      console.log(`   Result: ❌ Error - ${error.message}`);
    }
  } else {
    console.log('❌ Gmail is not configured');
    console.log('   Required: GMAIL_USER and GMAIL_APP_PASSWORD environment variables');
  }

  // Test Brevo Configuration
  console.log('\n📧 Testing Brevo Configuration:');
  console.log('-'.repeat(30));
  
  const brevoService = new EmailService();
  const brevoConfigured = await brevoService.testConfiguration();
  
  if (brevoConfigured) {
    console.log('✅ Brevo is properly configured and ready to send emails');
    
    // Test actual email sending (optional)
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    console.log(`\n📤 Testing Brevo email sending to: ${testEmail}`);
    try {
      const brevoResult = await brevoService.sendVerificationEmail(testEmail, '123456', 'Test User');
      console.log(`   Result: ${brevoResult ? '✅ Success' : '❌ Failed'}`);
    } catch (error) {
      console.log(`   Result: ❌ Error - ${error.message}`);
    }
  } else {
    console.log('❌ Brevo is not configured');
    console.log('   Required: BREVO_API_KEY environment variable');
  }

  // Configuration Summary
  console.log('\n📋 Configuration Summary:');
  console.log('=' .repeat(50));
  console.log(`   Gmail: ${gmailConfigured ? '✅ Ready' : '❌ Not configured'}`);
  console.log(`   Brevo: ${brevoConfigured ? '✅ Ready' : '❌ Not configured'}`);

  // Deployment Recommendations
  console.log('\n🚀 Deployment Recommendations:');
  console.log('=' .repeat(50));
  
  if (!gmailConfigured && !brevoConfigured) {
    console.log('⚠️  No email services are configured!');
    console.log('   Email verification will not work on the deployed system.');
    console.log('\n🔧 To fix this:');
    console.log('   1. Set up Gmail SMTP (recommended) or Brevo API');
    console.log('   2. Update environment variables in your deployment platform');
    console.log('   3. Redeploy the backend service');
    console.log('\n📧 Gmail Setup:');
    console.log('   - Enable 2-factor authentication on your Google account');
    console.log('   - Generate an App Password for Gmail');
    console.log('   - Set GMAIL_USER and GMAIL_APP_PASSWORD environment variables');
    console.log('\n📧 Brevo Setup:');
    console.log('   - Sign up at https://www.brevo.com/');
    console.log('   - Get your API key from the dashboard');
    console.log('   - Set BREVO_API_KEY environment variable');
    console.log('   - Contact support to activate SMTP account');
  } else if (gmailConfigured && !brevoConfigured) {
    console.log('✅ Gmail is configured - primary email service ready');
    console.log('💡 Consider setting up Brevo as a backup service');
  } else if (!gmailConfigured && brevoConfigured) {
    console.log('✅ Brevo is configured - primary email service ready');
    console.log('💡 Consider setting up Gmail as a backup service');
  } else {
    console.log('✅ Both email services are configured!');
    console.log('   Your app has redundant email sending capabilities.');
  }

  // Environment Variable Check
  console.log('\n🔍 Environment Variable Status:');
  console.log('-'.repeat(30));
  
  const envVars = [
    'GMAIL_USER',
    'GMAIL_APP_PASSWORD',
    'BREVO_API_KEY',
    'BREVO_SENDER_EMAIL'
  ];
  
  envVars.forEach(varName => {
    const value = process.env[varName];
    const status = value && value !== `your_${varName.toLowerCase()}_here` ? '✅ Set' : '❌ Not set';
    console.log(`   ${varName}: ${status}`);
  });

  // Deployment Platform Instructions
  console.log('\n🌐 Deployment Platform Instructions:');
  console.log('=' .repeat(50));
  
  console.log('\n📦 Render.com:');
  console.log('   1. Go to your service dashboard');
  console.log('   2. Navigate to Environment tab');
  console.log('   3. Add/update the following variables:');
  console.log('      - GMAIL_USER: your-gmail@gmail.com');
  console.log('      - GMAIL_APP_PASSWORD: your-app-password');
  console.log('      - BREVO_API_KEY: your-brevo-api-key');
  console.log('      - BREVO_SENDER_EMAIL: noreply@yourdomain.com');
  console.log('   4. Redeploy your service');
  
  console.log('\n📦 Vercel:');
  console.log('   1. Go to your project dashboard');
  console.log('   2. Navigate to Settings > Environment Variables');
  console.log('   3. Add the same variables as above');
  console.log('   4. Redeploy your project');

  console.log('\n✨ Testing complete!');
}

// Run the test
testEmailServices().catch(console.error);
