#!/usr/bin/env node

/**
 * Test FCM functionality directly
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Load Firebase service account
const serviceKeyPath = './server/service_key.json';
let serviceKey;

try {
  serviceKey = JSON.parse(fs.readFileSync(serviceKeyPath, 'utf8'));
  console.log('✅ Firebase service key loaded');
} catch (error) {
  console.error('❌ Failed to load Firebase service key:', error.message);
  process.exit(1);
}

async function testFCM() {
  console.log('🧪 Testing FCM functionality...\n');

  try {
    // Get a test user with push subscription
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('user_id, token')
      .limit(1);

    if (subError || !subscriptions || subscriptions.length === 0) {
      console.error('❌ No push subscriptions found:', subError);
      return;
    }

    const subscription = subscriptions[0];
    console.log(`📱 Testing with user: ${subscription.user_id}`);
    console.log(`🔑 Token: ${subscription.token.substring(0, 20)}...`);

    // Test FCM v1 API
    const accessToken = await getFCMAccessToken();
    if (!accessToken) {
      console.error('❌ Failed to get FCM access token');
      return;
    }

    console.log('✅ FCM access token obtained');

    // Send test notification
    const result = await sendFCMNotification(
      subscription.token,
      'Test Notification',
      'This is a test from the chat push notification system',
      '/chat'
    );

    if (result.ok) {
      console.log('✅ Test notification sent successfully!');
    } else {
      console.error('❌ Failed to send test notification');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function getFCMAccessToken() {
  try {
    const jwt = await import('jsonwebtoken');
    
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: serviceKey.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600
    };

    const token = jwt.default.sign(payload, serviceKey.private_key, {
      algorithm: 'RS256',
      keyid: serviceKey.private_key_id
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: token
      })
    });

    if (!response.ok) {
      throw new Error(`Token request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting FCM access token:', error);
    return null;
  }
}

async function sendFCMNotification(token, title, body, link) {
  try {
    const accessToken = await getFCMAccessToken();
    if (!accessToken) return { ok: false };

    const endpoint = `https://fcm.googleapis.com/v1/projects/${serviceKey.project_id}/messages:send`;
    const message = {
      message: {
        token: token,
        webpush: {
          notification: {
            title,
            body,
            icon: '/pwa-192x192.png'
          },
          fcmOptions: {
            link: String(link || '/')
          }
        },
        data: { link: String(link || '/') }
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('FCM send failed:', response.status, errorText);
      return { ok: false };
    }

    return { ok: true };
  } catch (error) {
    console.error('FCM send error:', error);
    return { ok: false };
  }
}

// Run the test
testFCM().then(() => {
  console.log('\n🎉 FCM test completed!');
  process.exit(0);
}).catch((error) => {
  console.error('❌ FCM test failed:', error);
  process.exit(1);
});
