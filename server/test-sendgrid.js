import { sendVerificationEmail, testEmailConnection } from './utils/sendgridService.js';
import dotenv from 'dotenv';

dotenv.config();

async function testSendGrid() {
  console.log('🧪 Testing SendGrid Email Service...\n');
  
  // Check if API key is set
  if (!process.env.SENDGRID_API_KEY || process.env.SENDGRID_API_KEY === 'your_sendgrid_api_key_here') {
    console.log('❌ SENDGRID_API_KEY is not set in .env file');
    console.log('Please:');
    console.log('1. Sign up at https://sendgrid.com');
    console.log('2. Create an API key');
    console.log('3. Add SENDGRID_API_KEY=your_api_key to .env file');
    return;
  }
  
  // Test connection first
  console.log('1. Testing SendGrid connection...');
  const connectionTest = await testEmailConnection();
  
  if (!connectionTest) {
    console.log('❌ SendGrid connection failed. Please check your API key.');
    return;
  }
  
  // Test sending email
  console.log('\n2. Testing email sending...');
  const emailTest = await sendVerificationEmail('test@example.com', '123456', 'registration');
  
  if (emailTest) {
    console.log('✅ Email sent successfully!');
    console.log('📧 Check your inbox for the test email.');
  } else {
    console.log('❌ Failed to send email.');
  }
}

testSendGrid().catch(console.error);
