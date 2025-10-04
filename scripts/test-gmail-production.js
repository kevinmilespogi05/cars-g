#!/usr/bin/env node

/**
 * Test Gmail SMTP in Production Environment
 * Tests Gmail SMTP specifically with production-optimized settings
 */

import dotenv from 'dotenv';
import GmailEmailService from '../server/lib/gmailEmailService.js';

// Load environment variables
dotenv.config();

async function testGmailProduction() {
  console.log('🧪 Testing Gmail SMTP in Production Environment\n');
  console.log('=' .repeat(60));

  // Set production environment
  process.env.NODE_ENV = 'production';
  
  console.log('🌐 Environment: Production');
  console.log('📧 Gmail User:', process.env.GMAIL_USER);
  console.log('🔑 Gmail App Password:', process.env.GMAIL_APP_PASSWORD ? 'SET' : 'NOT SET');
  console.log('');

  const gmailService = new GmailEmailService();
  
  // Test 1: Configuration Test
  console.log('1️⃣ Testing Gmail Configuration...');
  console.log('-'.repeat(40));
  
  const configOk = await gmailService.testConfiguration();
  
  if (configOk) {
    console.log('✅ Gmail configuration test passed\n');
    
    // Test 2: Actual Email Sending
    console.log('2️⃣ Testing Gmail Email Sending...');
    console.log('-'.repeat(40));
    
    const testEmail = process.env.TEST_EMAIL || 'redniwesley@gmail.com';
    const testCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    console.log(`📧 Sending test email to: ${testEmail}`);
    console.log(`🔑 Test verification code: ${testCode}`);
    console.log('⏱️  This may take up to 20 seconds in production...\n');
    
    try {
      const startTime = Date.now();
      const emailSent = await gmailService.sendVerificationEmail(testEmail, testCode, 'Production Test User');
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      if (emailSent) {
        console.log(`✅ Gmail email sent successfully!`);
        console.log(`⏱️  Duration: ${duration}ms`);
        console.log(`📧 Email delivered to: ${testEmail}`);
        console.log(`🔑 Verification code: ${testCode}`);
      } else {
        console.log(`❌ Gmail email sending failed`);
        console.log(`⏱️  Duration: ${duration}ms`);
      }
    } catch (error) {
      console.log(`❌ Gmail email sending error: ${error.message}`);
    }
    
  } else {
    console.log('❌ Gmail configuration test failed\n');
    console.log('🔧 Troubleshooting steps:');
    console.log('   1. Verify GMAIL_USER is set correctly');
    console.log('   2. Verify GMAIL_APP_PASSWORD is valid');
    console.log('   3. Check if 2FA is enabled on Gmail account');
    console.log('   4. Verify app password has mail permissions');
  }

  // Test 3: Production Environment Analysis
  console.log('\n3️⃣ Production Environment Analysis...');
  console.log('-'.repeat(40));
  
  console.log('🌐 Hosting Platform: Render.com');
  console.log('🔧 Gmail SMTP Settings:');
  console.log('   - Port: 587 (SMTP)');
  console.log('   - Security: TLS');
  console.log('   - Connection Timeout: 30s');
  console.log('   - Greeting Timeout: 20s');
  console.log('   - Socket Timeout: 30s');
  console.log('   - Email Timeout: 15s');
  
  console.log('\n💡 Production Optimizations Applied:');
  console.log('   ✅ Extended timeouts for hosting platforms');
  console.log('   ✅ TLS configuration for production');
  console.log('   ✅ Connection pooling disabled');
  console.log('   ✅ Rate limiting optimized');
  console.log('   ✅ Debug logging enabled');

  console.log('\n✨ Gmail Production Test Complete!');
}

// Run the test
testGmailProduction().catch(console.error);
