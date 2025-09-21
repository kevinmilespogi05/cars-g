#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkPushSubscriptions() {
  console.log('📱 Checking Current Push Subscriptions...\n');

  try {
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('user_id, platform, created_at, token')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error fetching push subscriptions:', error);
      return;
    }

    if (subs && subs.length > 0) {
      console.log(`✅ Found ${subs.length} push subscription(s):`);
      subs.forEach((sub, i) => {
        console.log(`   ${i+1}. User: ${sub.user_id}`);
        console.log(`      Platform: ${sub.platform}`);
        console.log(`      Token: ${sub.token.substring(0, 20)}...`);
        console.log(`      Created: ${sub.created_at}`);
        console.log('');
      });
    } else {
      console.log('❌ No push subscriptions found');
      console.log('💡 You need to:');
      console.log('   1. Open the app in your browser');
      console.log('   2. Grant notification permissions');
      console.log('   3. The app will register your device for push notifications');
    }

    // Also check admin user
    const { data: admin } = await supabase
      .from('profiles')
      .select('id, username, role')
      .eq('role', 'admin')
      .limit(1);

    if (admin && admin.length > 0) {
      console.log(`👨‍💼 Admin User: ${admin[0].username} (${admin[0].id})`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkPushSubscriptions();
