#!/usr/bin/env node

/**
 * Deploy Email Configuration Script
 * Helps update email configuration on Render and Vercel
 */

import fs from 'fs';
import path from 'path';

function deployEmailConfiguration() {
  console.log('🚀 Deploy Email Configuration\n');
  console.log('=' .repeat(50));

  // Read the current environment variables
  const gmailUser = 'cars.gsanpablo@gmail.com';
  const gmailPassword = 'uzft zdmm nmhk esxm';

  console.log('📋 Email Configuration to Deploy:');
  console.log('-'.repeat(30));
  console.log(`Gmail User: ${gmailUser}`);
  console.log(`Gmail Password: ${gmailPassword.substring(0, 4)}...`);

  console.log('\n🌐 Render.com Deployment:');
  console.log('=' .repeat(50));
  console.log('1. Go to https://dashboard.render.com/');
  console.log('2. Find your "cars-g-api" service');
  console.log('3. Click on the service name');
  console.log('4. Go to "Environment" tab');
  console.log('5. Update these variables:');
  console.log(`   GMAIL_USER = ${gmailUser}`);
  console.log(`   GMAIL_APP_PASSWORD = ${gmailPassword}`);
  console.log('6. Click "Save Changes"');
  console.log('7. Go to "Manual Deploy" tab');
  console.log('8. Click "Deploy latest commit"');

  console.log('\n🌐 Vercel Deployment:');
  console.log('=' .repeat(50));
  console.log('1. Go to https://vercel.com/dashboard');
  console.log('2. Find your "cars-g" project');
  console.log('3. Click on the project name');
  console.log('4. Go to "Settings" tab');
  console.log('5. Click "Environment Variables"');
  console.log('6. Add/Update these variables:');
  console.log(`   GMAIL_USER = ${gmailUser}`);
  console.log(`   GMAIL_APP_PASSWORD = ${gmailPassword}`);
  console.log('7. Click "Save"');
  console.log('8. Go to "Deployments" tab');
  console.log('9. Click "Redeploy" on the latest deployment');

  console.log('\n🧪 Test After Deployment:');
  console.log('=' .repeat(50));
  console.log('1. Wait for deployment to complete (2-3 minutes)');
  console.log('2. Test with: npm run test:verification');
  console.log('3. Or test directly on your app');

  console.log('\n📧 Expected Behavior:');
  console.log('-'.repeat(30));
  console.log('✅ Verification emails will be sent to user inboxes');
  console.log('✅ No more console log verification codes');
  console.log('✅ Professional email templates');
  console.log('✅ Reliable email delivery');

  console.log('\n🔍 Troubleshooting:');
  console.log('-'.repeat(30));
  console.log('If emails still don\'t work:');
  console.log('1. Check deployment logs for errors');
  console.log('2. Verify environment variables are set correctly');
  console.log('3. Test Gmail credentials locally first');
  console.log('4. Check Gmail app password is still valid');

  console.log('\n✨ Ready to deploy!');
  console.log('Follow the steps above to update your deployments.');
}

// Run the deployment guide
deployEmailConfiguration();
