import dotenv from 'dotenv';
dotenv.config();
import GmailEmailService from './lib/gmailEmailService.js';

async function testGmailService() {
  console.log('🧪 Testing Gmail Email Service...\n');

  const gmailService = new GmailEmailService();
  
  // Test configuration
  console.log('1. Testing Gmail configuration...');
  const configOk = await gmailService.testConfiguration();
  
  if (configOk) {
    console.log('   ✅ Gmail configuration is valid\n');
    
    // Test sending email
    console.log('2. Testing email sending...');
    const emailSent = await gmailService.sendVerificationEmail(
      'test@example.com', 
      '123456', 
      'Test User'
    );
    
    if (emailSent) {
      console.log('   ✅ Email sending test successful\n');
    } else {
      console.log('   ❌ Email sending test failed\n');
    }
  } else {
    console.log('   ❌ Gmail configuration failed\n');
    console.log('   📝 To fix this:');
    console.log('   1. Enable 2-factor authentication on your Gmail account');
    console.log('   2. Generate an App Password: https://myaccount.google.com/apppasswords');
    console.log('   3. Set GMAIL_USER and GMAIL_APP_PASSWORD in your .env file');
  }

  console.log('🎉 Gmail service test completed!');
}

testGmailService().catch(console.error);
