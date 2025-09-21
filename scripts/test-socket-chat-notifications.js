#!/usr/bin/env node

/**
 * Test chat push notifications via socket server
 */

import { createClient } from '@supabase/supabase-js';
import { io } from 'socket.io-client';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testSocketChatNotifications() {
  console.log('🧪 Testing Chat Push Notifications via Socket Server...\n');

  try {
    // Get test users
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, username, role')
      .in('role', ['user', 'admin'])
      .limit(2);

    if (usersError || !users || users.length < 2) {
      console.error('❌ Need at least 2 users (user and admin)');
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

    // Connect to socket server
    const socket = io('http://localhost:3001', {
      transports: ['websocket']
    });

    socket.on('connect', async () => {
      console.log('✅ Connected to socket server');

      // Authenticate as test user
      socket.emit('authenticate', { 
        token: 'test-token', // This would normally be a JWT token
        userId: testUser.id,
        userRole: testUser.role
      });

      socket.on('authenticated', () => {
        console.log('✅ Socket authenticated');

        // Join admin chat
        socket.emit('join_admin_chat', { adminId: adminUser.id });

        // Send test message
        setTimeout(() => {
          console.log('📤 Sending test message...');
          socket.emit('send_message', {
            message: 'Test message for push notifications',
            receiverId: adminUser.id
          });
        }, 1000);
      });

      socket.on('message_sent', (message) => {
        console.log('✅ Message sent:', message.id);
      });

      socket.on('chat_error', (error) => {
        console.error('❌ Chat error:', error);
      });
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
    });

    // Wait for test to complete
    setTimeout(() => {
      console.log('\n🔔 Checking created notifications...');
      checkNotifications();
    }, 5000);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function checkNotifications() {
  try {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('type', 'chat')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ Failed to fetch notifications:', error);
    } else {
      console.log(`✅ Found ${notifications.length} chat notifications:`);
      notifications.forEach((notification, index) => {
        console.log(`   ${index + 1}. ${notification.title}`);
        console.log(`      Message: ${notification.message}`);
        console.log(`      User: ${notification.user_id}`);
        console.log(`      Link: ${notification.link}`);
        console.log(`      Created: ${notification.created_at}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ Error checking notifications:', error);
  }
}

// Run the test
testSocketChatNotifications().then(() => {
  setTimeout(() => {
    console.log('🎉 Socket chat notification test completed!');
    process.exit(0);
  }, 10000);
}).catch((error) => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});
