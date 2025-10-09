import { sendVerificationEmail, testEmailConnection } from './utils/simpleEmailService.js';

async function testSimpleEmail() {
  console.log('🧪 Testing Simple Email Service...\n');
  
  // Test connection first
  console.log('1. Testing email service connection...');
  const connectionTest = await testEmailConnection();
  
  if (!connectionTest) {
    console.log('❌ Email service connection failed.');
    return;
  }
  
  // Test sending email
  console.log('\n2. Testing email sending...');
  const emailTest = await sendVerificationEmail('test@example.com', '123456', 'registration');
  
  if (emailTest) {
    console.log('✅ Email service working!');
    console.log('📧 Check console logs for email details.');
  } else {
    console.log('❌ Failed to send email.');
  }
}

testSimpleEmail().catch(console.error);
