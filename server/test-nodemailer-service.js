import dotenv from 'dotenv';
import NodemailerEmailService from './lib/nodemailerService.js';

// Load environment variables
dotenv.config();

/**
 * Test script for the new Nodemailer email service
 */
async function testNodemailerService() {
  console.log('🧪 Testing Nodemailer Email Service...\n');

  // Initialize the email service
  const emailService = new NodemailerEmailService();

  // Test 1: Connection verification
  console.log('1️⃣ Testing email service connection...');
  const connectionTest = await emailService.testConnection();
  if (connectionTest) {
    console.log('✅ Connection test passed\n');
  } else {
    console.log('❌ Connection test failed\n');
    return;
  }

  // Test 2: Send test email (if test email is provided)
  const testEmail = process.env.TEST_EMAIL;
  if (testEmail) {
    console.log('2️⃣ Sending test email...');
    const testEmailResult = await emailService.sendTestEmail(testEmail);
    if (testEmailResult) {
      console.log('✅ Test email sent successfully\n');
    } else {
      console.log('❌ Test email failed\n');
    }
  } else {
    console.log('2️⃣ Skipping test email (TEST_EMAIL not set)\n');
  }

  // Test 3: Send verification email (if test email is provided)
  if (testEmail) {
    console.log('3️⃣ Sending verification email...');
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationResult = await emailService.sendVerificationEmail(
      testEmail, 
      verificationCode, 
      'Test User'
    );
    
    if (verificationResult) {
      console.log('✅ Verification email sent successfully');
      console.log(`📧 Verification code: ${verificationCode}\n`);
    } else {
      console.log('❌ Verification email failed\n');
    }
  } else {
    console.log('3️⃣ Skipping verification email (TEST_EMAIL not set)\n');
  }

  console.log('🎉 Email service testing completed!');
  console.log('\n📝 Configuration Summary:');
  console.log(`   Provider: ${process.env.EMAIL_PROVIDER || 'gmail'}`);
  console.log(`   Sender: ${emailService.getSenderEmail()}`);
  
  if (process.env.EMAIL_PROVIDER === 'gmail') {
    console.log(`   Gmail User: ${process.env.GMAIL_USER || 'Not set'}`);
  } else if (process.env.EMAIL_PROVIDER === 'outlook') {
    console.log(`   Outlook User: ${process.env.OUTLOOK_USER || 'Not set'}`);
  } else if (process.env.EMAIL_PROVIDER === 'custom') {
    console.log(`   SMTP Host: ${process.env.SMTP_HOST || 'Not set'}`);
    console.log(`   SMTP Port: ${process.env.SMTP_PORT || 'Not set'}`);
  }
}

// Run the test
testNodemailerService().catch(error => {
  console.error('❌ Test failed with error:', error);
  process.exit(1);
});
