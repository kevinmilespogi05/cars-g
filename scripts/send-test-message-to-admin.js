#!/usr/bin/env node

/**
 * Send a test message to admin to trigger push notification
 * This simulates a real user sending a message through the socket connection
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

async function sendTestMessageToAdmin() {
  console.log('📤 Sending Test Message to Admin...\n');

  try {
    // Get a test user (non-admin)
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, username, role')
      .eq('role', 'user')
      .limit(1);

    if (usersError || !users || users.length === 0) {
      console.error('❌ No test users found:', usersError);
      return;
    }

    const testUser = users[0];
    console.log(`👤 Test User: ${testUser.username} (${testUser.id})`);

    // Get admin user
    const { data: admins, error: adminsError } = await supabase
      .from('profiles')
      .select('id, username, role')
      .eq('role', 'admin')
      .limit(1);

    if (adminsError || !admins || admins.length === 0) {
      console.error('❌ No admin users found:', adminsError);
      return;
    }

    const adminUser = admins[0];
    console.log(`👨‍💼 Admin User: ${adminUser.username} (${adminUser.id})`);

    // Check if admin has push subscriptions
    const { data: adminSubs } = await supabase
      .from('push_subscriptions')
      .select('token, platform')
      .eq('user_id', adminUser.id);

    if (adminSubs && adminSubs.length > 0) {
      console.log(`📱 Admin has ${adminSubs.length} push subscription(s)`);
    } else {
      console.log('⚠️  Admin has no push subscriptions - no notification will be sent');
    }

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
          const testMessage = `Test message for push notification - ${new Date().toLocaleString()}`;
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
        
        console.log('\n🔔 Push Notification Status:');
        console.log('   Check the server console for push notification logs');
        console.log('   Look for messages like:');
        console.log('   - "🔔 Attempting to send chat push notification..."');
        console.log('   - "📱 Found X push subscription(s) for user..."');
        console.log('   - "✅ Push notification sent successfully..."');
        
        if (!testCompleted) {
          testCompleted = true;
          console.log('\n🎉 Test message sent successfully!');
          console.log('\n📋 What to check:');
          console.log('   1. Check server console for push notification logs');
          console.log('   2. If you have a real push subscription, check your device');
          console.log('   3. Make sure notification permissions are granted in browser');
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
          console.log('📝 Check server logs for push notification attempts');
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
sendTestMessageToAdmin()
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
