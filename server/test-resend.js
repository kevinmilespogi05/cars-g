import { sendVerificationEmail, testEmailConnection } from './utils/resendService.js';
import dotenv from 'dotenv';

dotenv.config();

async function testResend() {
  console.log('🧪 Testing Resend Email Service...\n');
  
  // Check if API key is set
  if (!process.env.RESEND_API_KEY) {
    console.log('❌ RESEND_API_KEY is not set in .env file');
    return;
  }
  
  console.log('✅ Resend API key found:', process.env.RESEND_API_KEY.substring(0, 10) + '...');
  
  // Test connection first
  console.log('\n1. Testing Resend connection...');
  const connectionTest = await testEmailConnection();
  
  if (!connectionTest) {
    console.log('❌ Resend connection failed. Please check your API key.');
    return;
  }
  
  // Test sending email
  console.log('\n2. Testing email sending...');
  const emailTest = await sendVerificationEmail('202210346@gordoncollege.edu.ph', '123456', 'registration');
  
  if (emailTest) {
    console.log('✅ Email sent successfully!');
    console.log('📧 Check your inbox for the test email.');
  } else {
    console.log('❌ Failed to send email.');
  }
}

testResend().catch(console.error);
