#!/usr/bin/env node

/**
 * Manually create a chat notification to test frontend
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestChatNotification() {
  console.log('🧪 Creating test chat notification...\n');

  try {
    // Get a test user
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
    console.log(`👤 Creating notification for user: ${testUser.username} (${testUser.id})`);

    // Create a test chat notification
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: testUser.id,
        title: 'New message from Admin',
        message: 'Admin: This is a test chat notification',
        type: 'chat',
        link: '/chat',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (notificationError) {
      console.error('❌ Failed to create notification:', notificationError);
    } else {
      console.log('✅ Test chat notification created successfully!');
      console.log('   ID:', notification.id);
      console.log('   Title:', notification.title);
      console.log('   Message:', notification.message);
      console.log('   Type:', notification.type);
      console.log('   User:', notification.user_id);
      console.log('\n📱 Check your browser - you should see a notification!');
    }

  } catch (error) {
    console.error('❌ Error creating test notification:', error);
  }
}

createTestChatNotification().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
