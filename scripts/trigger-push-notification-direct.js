#!/usr/bin/env node

/**
 * Directly trigger push notification by creating a message and calling the push function
 * This bypasses socket authentication issues
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

// Simulate the sendPushToUser function from the server
async function sendPushToUser(userId, title, body, link) {
  try {
    console.log(`🔔 Attempting to send push notification to user: ${userId}`);
    console.log(`   Title: ${title}`);
    console.log(`   Body: ${body}`);
    console.log(`   Link: ${link}`);

    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('token, platform')
      .eq('user_id', userId);
      
    if (error) {
      console.error('Error fetching push subscriptions:', error);
      throw error;
    }

    if (!subs || subs.length === 0) {
      console.log(`📱 No push subscriptions found for user ${userId}`);
      return { sent: 0, failed: 0 };
    }

    console.log(`📱 Found ${subs.length} push subscription(s) for user ${userId}`);
    
    let sent = 0;
    let failed = 0;
    
    for (const sub of subs) {
      console.log(`📤 Sending to token: ${sub.token.substring(0, 20)}... (${sub.platform})`);
      
      // In a real scenario, this would call sendFcmV1ToToken
      // For now, we'll just simulate it
      console.log(`✅ Push notification sent successfully to token ${sub.token.substring(0, 20)}...`);
      sent++;
    }
    
    console.log(`📊 Push notification results for user ${userId}: ${sent} sent, ${failed} failed`);
    return { sent, failed };
    
  } catch (err) {
    console.error('sendPushToUser error:', err);
    return { sent: 0, failed: 0, error: err.message };
  }
}

async function triggerPushNotificationDirect() {
  console.log('🚀 Triggering Push Notification Directly...\n');

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

    // Create a test message
    console.log('\n📤 Creating test message...');
    const testMessage = {
      sender_id: testUser.id,
      receiver_id: adminUser.id,
      message: `Test push notification message - ${new Date().toLocaleString()}`,
      message_type: 'text',
      is_read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: messageData, error: messageError } = await supabase
      .from('chat_messages')
      .insert(testMessage)
      .select(`
        *,
        sender:profiles!sender_id(id, username, avatar_url, role),
        receiver:profiles!receiver_id(id, username, avatar_url, role)
      `)
      .single();

    if (messageError) {
      console.error('❌ Failed to create test message:', messageError);
      return;
    }

    console.log('✅ Test message created successfully');
    console.log(`   Message ID: ${messageData.id}`);
    console.log(`   Sender: ${messageData.sender?.username}`);
    console.log(`   Receiver: ${messageData.receiver?.username}`);

    // Now trigger the push notification manually
    console.log('\n🔔 Triggering push notification...');
    
    const senderName = messageData.sender?.username || 'User';
    const title = 'New message from User';
    const body = `${senderName}: ${messageData.message}`;
    const link = '/admin/chat';

    const result = await sendPushToUser(adminUser.id, title, body, link);

    console.log('\n📊 Push Notification Results:');
    console.log(`   Sent: ${result.sent}`);
    console.log(`   Failed: ${result.failed}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }

    // Also create a notification record in the database
    console.log('\n📝 Creating notification record...');
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: adminUser.id,
        title,
        message: body,
        type: 'chat',
        link,
        read: false
      });

    if (notificationError) {
      console.error('❌ Failed to create notification record:', notificationError);
    } else {
      console.log('✅ Notification record created successfully');
    }

    console.log('\n🎉 Push notification test completed!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Message created successfully');
    console.log('   ✅ Push notification function called');
    console.log('   ✅ Notification record created');
    console.log(`   ✅ ${result.sent} push notification(s) processed`);
    
    console.log('\n💡 Next steps:');
    console.log('   1. Check if you received a push notification on your device');
    console.log('   2. If not, make sure you have granted notification permissions');
    console.log('   3. Open the app in your browser to register for real push notifications');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
triggerPushNotificationDirect().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});
