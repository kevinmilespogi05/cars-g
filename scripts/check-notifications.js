#!/usr/bin/env node

/**
 * Check notifications in database
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

async function checkNotifications() {
  console.log('🔍 Checking notifications in database...\n');

  try {
    // Check all notifications
    const { data: allNotifications, error: allError } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (allError) {
      console.error('❌ Failed to fetch notifications:', allError);
      return;
    }

    console.log(`📊 Total notifications: ${allNotifications.length}`);
    
    if (allNotifications.length > 0) {
      console.log('\n📋 Recent notifications:');
      allNotifications.forEach((notification, index) => {
        console.log(`   ${index + 1}. ${notification.title}`);
        console.log(`      Type: ${notification.type}`);
        console.log(`      User: ${notification.user_id}`);
        console.log(`      Message: ${notification.message}`);
        console.log(`      Created: ${notification.created_at}`);
        console.log('');
      });
    }

    // Check chat notifications specifically
    const { data: chatNotifications, error: chatError } = await supabase
      .from('notifications')
      .select('*')
      .eq('type', 'chat')
      .order('created_at', { ascending: false });

    if (chatError) {
      console.error('❌ Failed to fetch chat notifications:', chatError);
    } else {
      console.log(`💬 Chat notifications: ${chatNotifications.length}`);
    }

    // Check if notifications table exists and has proper structure
    const { data: tableInfo, error: tableError } = await supabase
      .from('notifications')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('❌ Notifications table error:', tableError);
    } else {
      console.log('✅ Notifications table is accessible');
    }

  } catch (error) {
    console.error('❌ Error checking notifications:', error);
  }
}

checkNotifications().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
