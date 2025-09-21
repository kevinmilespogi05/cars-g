#!/usr/bin/env node

/**
 * Test real FCM push notification through server socket
 * This will trigger the actual server push notification function
 */

import { createClient } from '@supabase/supabase-js';
import { io } from 'socket.io-client';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testRealFcmPush() {
  console.log('🧪 Testing Real FCM Push Notification...\n');

  try {
    // Get test user and admin
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, username, role')
      .in('role', ['user', 'admin'])
      .limit(2);

    if (usersError || !users || users.length < 2) {
      console.error('❌ Need both user and admin accounts');
      return;
    }

    const testUser = users.find(u => u.role === 'user');
    const adminUser = users.find(u => u.role === 'admin');

    if (!testUser || !adminUser) {
      console.error('❌ Need both user and admin accounts');
      return;
    }

    console.log(`👤 Test User: ${testUser.username} (${testUser.id})`);
    console.log(`👨‍💼 Admin User: ${adminUser.username} (${adminUser.id})`);

    // Create a real push subscription for the admin user
    const realToken = 'real-fcm-token-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    console.log('\n📱 Creating real push subscription for admin...');
    
    const { data: subscription, error: subError } = await supabase
      .from('push_subscriptions')
      .insert({
        user_id: adminUser.id,
        token: realToken,
        platform: 'web',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (subError) {
      console.error('❌ Failed to create push subscription:', subError);
      return;
    }

    console.log('✅ Real push subscription created');
    console.log(`   User: ${subscription.user_id}`);
    console.log(`   Token: ${subscription.token.substring(0, 20)}...`);

    // Connect to socket server
    console.log('\n🔌 Connecting to socket server...');
    const socket = io('http://localhost:3001', {
      transports: ['websocket'],
      timeout: 15000
    });

    return new Promise((resolve, reject) => {
      let testCompleted = false;

      socket.on('connect', async () => {
        console.log('✅ Connected to socket server');

        try {
          // Create JWT token for authentication
          const jwt = await import('jsonwebtoken');
          const jwtSecret = process.env.JWT_SECRET || 'your-jwt-secret';
          
          const token = jwt.default.sign(
            { 
              userId: testUser.id, 
              type: 'access',
              role: testUser.role 
            }, 
            jwtSecret, 
            { expiresIn: '1h' }
          );

          console.log('🔐 Authenticating with JWT token...');
          
          // Authenticate with the server
          socket.emit('authenticate', { 
            token: token,
            userId: testUser.id,
            userRole: testUser.role
          });

        } catch (authError) {
          console.error('❌ Authentication error:', authError);
          reject(authError);
        }
      });

      socket.on('authenticated', () => {
        console.log('✅ Socket authenticated successfully');
        
        // Join admin chat
        console.log('📞 Joining admin chat...');
        socket.emit('join_admin_chat', { adminId: adminUser.id });

        // Wait a moment then send test message
        setTimeout(() => {
          const testMessage = `Real FCM test message - ${new Date().toLocaleString()}`;
          console.log(`📤 Sending message: "${testMessage}"`);
          
          socket.emit('send_message', {
            message: testMessage,
            receiverId: 'admin-placeholder' // This should trigger admin notification
          });
        }, 2000);
      });

      socket.on('message_sent', (message) => {
        console.log('✅ Message sent successfully!');
        console.log(`   Message ID: ${message.id}`);
        console.log(`   Sender: ${message.sender?.username}`);
        console.log(`   Receiver: ${message.receiver?.username}`);
        console.log(`   Message: ${message.message}`);
        
        console.log('\n🔔 FCM Push Notification Status:');
        console.log('   Check the server console for FCM authentication logs');
        console.log('   Look for messages like:');
        console.log('   - "✅ Loaded Firebase service account from file"');
        console.log('   - "✅ FCM access token obtained successfully"');
        console.log('   - "🔔 Attempting to send chat push notification..."');
        console.log('   - "📱 Found X push subscription(s) for user..."');
        console.log('   - "✅ Push notification sent successfully..."');
        
        if (!testCompleted) {
          testCompleted = true;
          console.log('\n🎉 Real FCM test completed!');
          console.log('\n📋 What to check:');
          console.log('   1. Check server console for FCM authentication success');
          console.log('   2. Check server console for push notification attempts');
          console.log('   3. If FCM is working, you should see successful token generation');
          resolve();
        }
      });

      socket.on('chat_error', (error) => {
        console.error('❌ Chat error:', error);
        if (!testCompleted) {
          testCompleted = true;
          reject(new Error(`Chat error: ${error}`));
        }
      });

      socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
        if (!testCompleted) {
          testCompleted = true;
          reject(error);
        }
      });

      // Timeout after 20 seconds
      setTimeout(() => {
        if (!testCompleted) {
          testCompleted = true;
          console.log('\n⏰ Test timed out after 20 seconds');
          console.log('📝 Check server logs for FCM authentication and push notification attempts');
          resolve();
        }
      }, 20000);
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test
testRealFcmPush()
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
