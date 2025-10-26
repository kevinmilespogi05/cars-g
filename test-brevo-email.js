#!/usr/bin/env node

// Test script to send real email via Brevo API
import { TransactionalEmailsApi, SendSmtpEmail } from '@getbrevo/brevo';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Brevo API configuration
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const EMAIL_SENDER = process.env.EMAIL_SENDER || 'CARS-G <noreply@cars-g.com>';
const TEST_EMAIL = 'redniwesley@gmail.com';

if (!BREVO_API_KEY) {
  console.error('❌ BREVO_API_KEY not found in environment variables');
  console.log('📋 Please set BREVO_API_KEY in your .env file');
  process.exit(1);
}

// Initialize Brevo API
const emailAPI = new TransactionalEmailsApi();
emailAPI.authentications.apiKey.apiKey = BREVO_API_KEY;

// Generate test OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate OTP email HTML template
function generateOTPEmailHTML(firstName, otp) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - CARS-G</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-code { background: #f0f9ff; border: 2px solid #0ea5e9; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
            .otp-number { font-size: 32px; font-weight: bold; color: #0ea5e9; letter-spacing: 4px; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
            .security-notice { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🚗 Welcome to CARS-G!</h1>
            <p>Community Safety Platform</p>
        </div>
        
        <div class="content">
            <h2>Hi ${firstName}!</h2>
            
            <p>Thank you for registering with CARS-G, your community safety platform. To complete your registration, please verify your email address using the code below.</p>
            
            <div class="otp-code">
                <h3>Your Verification Code</h3>
                <div class="otp-number">${otp}</div>
                <p style="margin: 10px 0 0 0; color: #666;">This code will expire in 10 minutes</p>
            </div>
            
            <div class="security-notice">
                <strong>🔒 Security Notice:</strong> This verification code will expire in 10 minutes for your security. If you didn't create an account with CARS-G, please ignore this email.
            </div>
            
            <p><strong>What's next after verification?</strong></p>
            <ul>
                <li>Your account will be reviewed by our admin team</li>
                <li>You'll receive notification once approved</li>
                <li>Start contributing to community safety!</li>
            </ul>
            
            <p>If you didn't request this code, please ignore this email. Your account will not be created without verification.</p>
        </div>
        
        <div class="footer">
            <p>This email was sent by CARS-G Community Safety Platform</p>
            <p>If you have any questions, please contact our support team.</p>
        </div>
    </body>
    </html>
  `;
}

// Send test email
async function sendTestEmail() {
  console.log('🧪 Testing Brevo Email Integration...\n');
  
  const otp = generateOTP();
  const firstName = 'Wesley';
  
  console.log('📧 Email Details:');
  console.log(`   To: ${TEST_EMAIL}`);
  console.log(`   From: ${EMAIL_SENDER}`);
  console.log(`   OTP: ${otp}`);
  console.log(`   Subject: Verify Your Email - CARS-G Community Safety\n`);
  
  const message = new SendSmtpEmail();
  message.subject = 'Verify Your Email - CARS-G Community Safety';
  message.htmlContent = generateOTPEmailHTML(firstName, otp);
  message.sender = { 
    email: EMAIL_SENDER.split(' <')[1]?.replace('>', '') || 'noreply@cars-g.com', 
    name: EMAIL_SENDER.split(' <')[0] || 'CARS-G' 
  };
  message.to = [{ email: TEST_EMAIL, name: firstName }];

  try {
    console.log('📤 Sending email via Brevo API...');
    const result = await emailAPI.sendTransacEmail(message);
    
    console.log('✅ Email sent successfully!');
    console.log('📊 Response:', {
      messageId: result.messageId,
      status: 'sent'
    });
    
    console.log('\n📧 Check your Gmail inbox for the verification email');
    console.log(`🔑 Your test OTP is: ${otp}`);
    console.log('\n🎉 Brevo integration is working correctly!');
    
    return { success: true, messageId: result.messageId, otp };
    
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    
    if (error.response) {
      console.error('📊 Error details:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check your BREVO_API_KEY in .env file');
    console.log('2. Verify the API key is valid in Brevo dashboard');
    console.log('3. Check if the sender email is verified in Brevo');
    console.log('4. Ensure you have sufficient credits in Brevo');
    
    return { success: false, error: error.message };
  }
}

// Run the test
sendTestEmail();
