#!/usr/bin/env node

/**
 * Clear invalid push subscriptions from database
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

async function clearInvalidTokens() {
  console.log('🧹 Clearing invalid push subscription tokens...\n');

  try {
    // Get current tokens
    const { data: tokens, error: tokensError } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (tokensError) {
      console.error('❌ Error fetching tokens:', tokensError);
      return;
    }

    console.log(`📱 Found ${tokens.length} push subscriptions`);

    // Delete all existing tokens (they're all invalid based on the UNREGISTERED error)
    const { error: deleteError } = await supabase
      .from('push_subscriptions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
      console.error('❌ Error deleting tokens:', deleteError);
      return;
    }

    console.log('✅ All invalid push subscriptions cleared');
    console.log('\n📋 Next steps:');
    console.log('1. Make sure Firebase service account is properly configured');
    console.log('2. Restart your application');
    console.log('3. Users will need to refresh the page to get new valid tokens');
    console.log('4. Test notifications with new tokens');

  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

clearInvalidTokens().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
