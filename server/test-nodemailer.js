import { sendVerificationEmail, testEmailConnection } from './utils/nodemailerService.js';
import dotenv from 'dotenv';

dotenv.config();

async function testNodemailer() {
  console.log('🧪 Testing Nodemailer Email Service...\n');
  
  // Test connection first
  console.log('1. Testing email server connection...');
  const connectionTest = await testEmailConnection();
  
  if (!connectionTest) {
    console.log('❌ Email connection failed. Please check your credentials.');
    console.log('Make sure you have:');
    console.log('- GORDON_EMAIL_PASSWORD set in .env file');
    console.log('- Generated a Gmail App Password');
    console.log('- Enabled 2FA on your Google account');
    return;
  }
  
  // Test sending email
  console.log('\n2. Testing email sending...');
  const emailTest = await sendVerificationEmail('redniwesley@gmail.com', '123456', 'registration');
  
  if (emailTest) {
    console.log('✅ Email sent successfully!');
    console.log('📧 Check your inbox for the test email.');
  } else {
    console.log('❌ Failed to send email.');
  }
}

testNodemailer().catch(console.error);
