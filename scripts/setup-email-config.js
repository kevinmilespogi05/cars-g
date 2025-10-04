#!/usr/bin/env node

/**
 * Email Configuration Setup Script
 * Helps set up email services for deployment
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

function setupEmailConfiguration() {
  console.log('🔧 Email Configuration Setup\n');
  console.log('=' .repeat(50));

  // Check current configuration
  console.log('📋 Current Configuration Status:');
  console.log('-'.repeat(30));
  
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  const brevoKey = process.env.BREVO_API_KEY;
  const brevoEmail = process.env.BREVO_SENDER_EMAIL;

  console.log(`Gmail User: ${gmailUser ? '✅ Set' : '❌ Not set'}`);
  console.log(`Gmail Password: ${gmailPass ? '✅ Set' : '❌ Not set'}`);
  console.log(`Brevo API Key: ${brevoKey && brevoKey !== 'your_brevo_api_key_here' ? '✅ Set' : '❌ Not set'}`);
  console.log(`Brevo Sender: ${brevoEmail ? '✅ Set' : '❌ Not set'}`);

  // Generate environment file for deployment
  console.log('\n📝 Generating deployment environment file...');
  
  const envContent = `# Email Configuration for Deployment
# Copy these to your deployment platform (Render/Vercel)

# Gmail SMTP Configuration (Recommended)
GMAIL_USER=${gmailUser || 'your-gmail@gmail.com'}
GMAIL_APP_PASSWORD=${gmailPass || 'your-16-character-app-password'}

# Brevo API Configuration (Alternative)
BREVO_API_KEY=${brevoKey || 'your-brevo-api-key-here'}
BREVO_SENDER_EMAIL=${brevoEmail || 'noreply@yourdomain.com'}

# Email Fallback Settings
EMAIL_FALLBACK_MODE=true
EMAIL_DEBUG_MODE=true
`;

  fs.writeFileSync('email-env.txt', envContent);
  console.log('✅ Created email-env.txt file');

  // Generate deployment instructions
  console.log('\n📋 Deployment Instructions:');
  console.log('=' .repeat(50));
  
  console.log('\n🌐 For Render.com:');
  console.log('1. Go to your service dashboard');
  console.log('2. Navigate to Environment tab');
  console.log('3. Copy variables from email-env.txt');
  console.log('4. Update with your actual values');
  console.log('5. Redeploy your service');

  console.log('\n🌐 For Vercel:');
  console.log('1. Go to your project dashboard');
  console.log('2. Navigate to Settings → Environment Variables');
  console.log('3. Copy variables from email-env.txt');
  console.log('4. Update with your actual values');
  console.log('5. Redeploy your project');

  // Gmail setup instructions
  if (!gmailUser || !gmailPass) {
    console.log('\n📧 Gmail Setup Instructions:');
    console.log('-'.repeat(30));
    console.log('1. Enable 2-factor authentication on your Google account');
    console.log('2. Go to Google Account settings');
    console.log('3. Security → 2-Step Verification → App passwords');
    console.log('4. Generate password for "Mail"');
    console.log('5. Use your Gmail address and the generated password');
  }

  // Brevo setup instructions
  if (!brevoKey || brevoKey === 'your_brevo_api_key_here') {
    console.log('\n📧 Brevo Setup Instructions:');
    console.log('-'.repeat(30));
    console.log('1. Sign up at https://www.brevo.com/');
    console.log('2. Get your API key from the dashboard');
    console.log('3. Contact support to activate SMTP account');
    console.log('4. Use your API key and sender email');
  }

  console.log('\n🧪 Test your configuration:');
  console.log('npm run test:email');
  
  console.log('\n✨ Setup complete!');
  console.log('Check email-env.txt for deployment variables');
}

// Run the setup
setupEmailConfiguration();
