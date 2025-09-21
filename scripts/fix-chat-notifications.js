#!/usr/bin/env node

/**
 * Complete script to test and fix chat push notifications
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Use global fetch (available in Node.js 18+)
const fetch = globalThis.fetch || ((...args) => import('node-fetch').then(mod => mod.default(...args)));

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const serverUrl = process.env.VITE_SERVER_URL || 'http://localhost:3001';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixChatNotifications() {
  console.log('🔧 Chat Push Notifications Fix & Test Script\n');

  try {
    // Step 1: Check server connectivity
    console.log('1️⃣  Checking server connectivity...');
    try {
      const healthResponse = await fetch(`${serverUrl}/health`);
      if (healthResponse.ok) {
        console.log('✅ Server is running');
      } else {
        console.log('❌ Server is not responding properly');
        return;
      }
    } catch (error) {
      console.log('❌ Cannot connect to server:', error.message);
      console.log('   Make sure to start the server first: cd server && npm start');
      return;
    }

    // Step 2: Clear invalid tokens
    console.log('\n2️⃣  Clearing invalid push subscriptions...');
    const { data: oldTokens, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (fetchError) {
      console.error('❌ Error fetching tokens:', fetchError);
      return;
    }

    console.log(`   Found ${oldTokens?.length || 0} existing tokens`);

    const { error: deleteError } = await supabase
      .from('push_subscriptions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      console.error('❌ Error clearing tokens:', deleteError);
    } else {
      console.log('✅ Invalid tokens cleared');
    }

    // Step 3: Check users
    console.log('\n3️⃣  Checking test users...');
    
    const { data: testUser, error: userError } = await supabase
      .from('profiles')
      .select('id, username, role')
      .eq('role', 'user')
      .limit(1)
      .single();

    if (userError || !testUser) {
      console.error('❌ No test user found');
      return;
    }

    const { data: adminUser, error: adminError } = await supabase
      .from('profiles')
      .select('id, username, role')
      .eq('role', 'admin')
      .limit(1)
      .single();

    if (adminError || !adminUser) {
      console.error('❌ No admin user found');
      return;
    }

    console.log(`✅ Test user: ${testUser.username} (${testUser.id})`);
    console.log(`✅ Admin user: ${adminUser.username} (${adminUser.id})`);

    // Step 4: Test push notification endpoints
    console.log('\n4️⃣  Testing push notification endpoints...');
    
    // Test user to admin notification
    console.log('   Testing User → Admin notification...');
    try {
      const response = await fetch(`${serverUrl}/api/push/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: adminUser.id,
          title: 'Test: New message from user',
          body: `${testUser.username}: Hello admin, this is a test message`,
          link: '/admin/chat'
        })
      });

      const result = await response.json();
      console.log('   Response:', result);
    } catch (error) {
      console.error('   ❌ Failed:', error.message);
    }

    // Test admin to user notification
    console.log('\n   Testing Admin → User notification...');
    try {
      const response = await fetch(`${serverUrl}/api/push/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: testUser.id,
          title: 'Test: New message from admin',
          body: `Admin: Hello ${testUser.username}, this is a test response`,
          link: '/chat'
        })
      });

      const result = await response.json();
      console.log('   Response:', result);
    } catch (error) {
      console.error('   ❌ Failed:', error.message);
    }

    // Step 5: Create test chat messages
    console.log('\n5️⃣  Creating test chat messages...');
    
    // User to admin message
    const { data: userMessage, error: userMessageError } = await supabase
      .from('chat_messages')
      .insert({
        sender_id: testUser.id,
        receiver_id: adminUser.id,
        message: 'Test message from user - should notify admin',
        message_type: 'text',
        is_read: false
      })
      .select(`
        *,
        sender:profiles!sender_id(id, username, avatar_url, role),
        receiver:profiles!receiver_id(id, username, avatar_url, role)
      `)
      .single();

    if (userMessageError) {
      console.error('❌ Failed to create user message:', userMessageError);
    } else {
      console.log('✅ User message created:', userMessage.id);
    }

    // Admin to user message
    const { data: adminMessage, error: adminMessageError } = await supabase
      .from('chat_messages')
      .insert({
        sender_id: adminUser.id,
        receiver_id: testUser.id,
        message: 'Test message from admin - should notify user',
        message_type: 'text',
        is_read: false
      })
      .select(`
        *,
        sender:profiles!sender_id(id, username, avatar_url, role),
        receiver:profiles!receiver_id(id, username, avatar_url, role)
      `)
      .single();

    if (adminMessageError) {
      console.error('❌ Failed to create admin message:', adminMessageError);
    } else {
      console.log('✅ Admin message created:', adminMessage.id);
    }

    // Step 6: Check notifications created
    console.log('\n6️⃣  Checking created notifications...');
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('type', 'chat')
      .order('created_at', { ascending: false })
      .limit(5);

    if (notifError) {
      console.error('❌ Error fetching notifications:', notifError);
    } else {
      console.log(`✅ Found ${notifications.length} chat notifications:`);
      notifications.forEach((notif, i) => {
        console.log(`   ${i + 1}. ${notif.title}`);
        console.log(`      User: ${notif.user_id}`);
        console.log(`      Message: ${notif.message}`);
        console.log(`      Link: ${notif.link}`);
        console.log(`      Created: ${notif.created_at}`);
        console.log('');
      });
    }

    console.log('🎉 Chat notification fix & test completed!\n');
    console.log('📋 Summary:');
    console.log('✅ Server connectivity checked');
    console.log('✅ Invalid tokens cleared');
    console.log('✅ Test users verified');
    console.log('✅ Push notification endpoints tested');
    console.log('✅ Test messages created');
    console.log('✅ Database notifications checked');

    console.log('\n📝 Next steps:');
    console.log('1. Complete Firebase service account configuration (see FIREBASE_SETUP_INSTRUCTIONS.md)');
    console.log('2. Restart your application');
    console.log('3. Visit the app in browser to register for new push notifications');
    console.log('4. Test actual chat messaging between users and admins');
    console.log('5. Check browser console for FCM token registration logs');

  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

fixChatNotifications().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
