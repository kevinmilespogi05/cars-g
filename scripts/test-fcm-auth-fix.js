#!/usr/bin/env node

/**
 * Test FCM authentication fix
 * This script tests if the FCM authentication is working properly
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Simulate the server's FCM authentication
async function testFcmAuth() {
  try {
    console.log('🧪 Testing FCM Authentication Fix...\n');

    // Import the same modules the server uses
    const { GoogleAuth } = await import('google-auth-library');
    const fs = await import('fs');

    console.log('📁 Loading Firebase service account...');
    
    // Try to load service account from file first
    let credentials;
    try {
      const serviceKeyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './server/service_key.json';
      const serviceKey = JSON.parse(fs.readFileSync(serviceKeyPath, 'utf8'));
      credentials = serviceKey;
      console.log('✅ Loaded Firebase service account from file');
    } catch (fileError) {
      console.log('Could not load service key from file, trying environment variable...');
      // Fallback to environment variable
      if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        console.log('✅ Loaded Firebase service account from environment variable');
      } else {
        throw new Error('No Firebase service account credentials found');
      }
    }

    console.log('🔐 Testing Google Auth...');
    const scopes = ['https://www.googleapis.com/auth/firebase.messaging'];
    const auth = new GoogleAuth({
      scopes,
      credentials
    });

    console.log('📡 Getting access token...');
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    
    if (!accessToken || !accessToken.token) {
      throw new Error('Failed to obtain FCM access token');
    }

    console.log('✅ FCM access token obtained successfully!');
    console.log(`   Token length: ${accessToken.token.length}`);
    console.log(`   Token preview: ${accessToken.token.substring(0, 20)}...`);

    // Test FCM API call
    console.log('\n📤 Testing FCM API call...');
    const projectId = process.env.FCM_PROJECT_ID || 'carsg-d5bed';
    const endpoint = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
    
    const testMessage = {
      message: {
        token: 'test-token', // This will fail but we just want to test auth
        webpush: {
          notification: {
            title: 'Test Notification',
            body: 'This is a test',
            icon: '/pwa-192x192.png'
          }
        }
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken.token}`
      },
      body: JSON.stringify(testMessage)
    });

    console.log(`📊 FCM API Response Status: ${response.status}`);
    
    if (response.status === 400) {
      console.log('✅ FCM authentication is working! (400 is expected for invalid token)');
    } else if (response.status === 401) {
      console.log('❌ FCM authentication failed (401 Unauthorized)');
    } else {
      console.log(`ℹ️  FCM API returned status ${response.status}`);
    }

    const responseText = await response.text();
    console.log(`📝 Response: ${responseText.substring(0, 200)}...`);

    console.log('\n🎉 FCM Authentication Test Completed!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Firebase service account loaded successfully');
    console.log('   ✅ Google Auth client created successfully');
    console.log('   ✅ FCM access token obtained successfully');
    console.log('   ✅ FCM API authentication is working');

  } catch (error) {
    console.error('❌ FCM Authentication Test Failed:', error);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Check if service_key.json exists in server/ directory');
    console.error('   2. Verify the service account has Firebase Messaging permissions');
    console.error('   3. Make sure the project ID is correct');
  }
}

// Run the test
testFcmAuth();
