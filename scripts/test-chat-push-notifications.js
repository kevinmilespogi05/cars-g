#!/usr/bin/env node

/**
 * Test script for chat push notifications
 * This script tests the chat push notification functionality by simulating message sending
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testChatPushNotifications() {
  console.log('🧪 Testing Chat Push Notifications...\n');

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

    // Test 1: User sends message to admin (should trigger push notification to admin)
    console.log('\n📤 Test 1: User → Admin message');
    const userMessage = {
      sender_id: testUser.id,
      receiver_id: adminUser.id,
      message: 'Test message from user to admin',
      message_type: 'text',
      is_read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: userMessageData, error: userMessageError } = await supabase
      .from('chat_messages')
      .insert(userMessage)
      .select(`
        *,
        sender:profiles!sender_id(id, username, avatar_url, role),
        receiver:profiles!receiver_id(id, username, avatar_url, role)
      `)
      .single();

    if (userMessageError) {
      console.error('❌ Failed to create user message:', userMessageError);
    } else {
      console.log('✅ User message created successfully');
      console.log('   Message ID:', userMessageData.id);
      console.log('   Sender:', userMessageData.sender?.username);
      console.log('   Receiver:', userMessageData.receiver?.username);
    }

    // Wait a moment for the trigger to process
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 2: Admin sends message to user (should trigger push notification to user)
    console.log('\n📤 Test 2: Admin → User message');
    const adminMessage = {
      sender_id: adminUser.id,
      receiver_id: testUser.id,
      message: 'Test message from admin to user',
      message_type: 'text',
      is_read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: adminMessageData, error: adminMessageError } = await supabase
      .from('chat_messages')
      .insert(adminMessage)
      .select(`
        *,
        sender:profiles!sender_id(id, username, avatar_url, role),
        receiver:profiles!receiver_id(id, username, avatar_url, role)
      `)
      .single();

    if (adminMessageError) {
      console.error('❌ Failed to create admin message:', adminMessageError);
    } else {
      console.log('✅ Admin message created successfully');
      console.log('   Message ID:', adminMessageData.id);
      console.log('   Sender:', adminMessageData.sender?.username);
      console.log('   Receiver:', adminMessageData.receiver?.username);
    }

    // Wait a moment for the trigger to process
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if notifications were created
    console.log('\n🔔 Checking created notifications...');
    
    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('*')
      .eq('type', 'chat')
      .order('created_at', { ascending: false })
      .limit(5);

    if (notificationsError) {
      console.error('❌ Failed to fetch notifications:', notificationsError);
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

    // Check push subscriptions
    console.log('📱 Checking push subscriptions...');
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .limit(5);

    if (subscriptionsError) {
      console.error('❌ Failed to fetch push subscriptions:', subscriptionsError);
    } else {
      console.log(`✅ Found ${subscriptions.length} push subscriptions:`);
      subscriptions.forEach((subscription, index) => {
        console.log(`   ${index + 1}. User: ${subscription.user_id}`);
        console.log(`      Platform: ${subscription.platform}`);
        console.log(`      Token: ${subscription.token.substring(0, 20)}...`);
        console.log(`      Created: ${subscription.created_at}`);
        console.log('');
      });
    }

    console.log('🎉 Chat push notification test completed!');
    console.log('\n📋 Next steps:');
    console.log('   1. Make sure users have granted notification permissions');
    console.log('   2. Check browser console for push notification logs');
    console.log('   3. Test with actual chat interface to verify end-to-end functionality');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testChatPushNotifications().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});
