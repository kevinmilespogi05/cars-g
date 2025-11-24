#!/usr/bin/env node

/**
 * Script to fix email_verified status for users who have verified their email
 * but the flag wasn't set correctly in the database.
 * 
 * Usage: node scripts/fix-email-verified.js [email]
 * If email is provided, only that user will be updated.
 * If no email is provided, all users with email_confirmed_at in Supabase Auth
 * but email_verified=false in profiles will be updated.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../server/.env') });
dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('Required environment variables:');
  console.error('  - VITE_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixEmailVerified(email = null) {
  console.log('🔧 Starting email verification fix...\n');

  try {
    if (email) {
      // Fix specific user by email
      console.log(`📧 Fixing email verification for: ${email}`);
      
      // Get user from auth
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) {
        console.error('❌ Error fetching auth users:', authError);
        return;
      }

      const user = authUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (!user) {
        console.error(`❌ User with email ${email} not found in Supabase Auth`);
        return;
      }

      // Check if email is confirmed in auth
      if (!user.email_confirmed_at) {
        console.log(`⚠️  Email ${email} is not confirmed in Supabase Auth`);
        console.log('   This user needs to verify their email first.');
        return;
      }

      // Update profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .update({ 
          email_verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (profileError) {
        console.error('❌ Error updating profile:', profileError);
        return;
      }

      console.log(`✅ Successfully updated email_verified for ${email}`);
      console.log(`   User ID: ${user.id}`);
      console.log(`   Username: ${profile.username || 'N/A'}`);
      
    } else {
      // Fix all users with confirmed emails but unverified profiles
      console.log('📋 Finding users with confirmed emails but unverified profiles...\n');

      // Get all auth users
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) {
        console.error('❌ Error fetching auth users:', authError);
        return;
      }

      // Filter users with confirmed emails
      const confirmedUsers = authUsers.users.filter(u => u.email_confirmed_at);
      console.log(`Found ${confirmedUsers.length} users with confirmed emails in Supabase Auth\n`);

      let fixedCount = 0;
      let skippedCount = 0;

      for (const user of confirmedUsers) {
        // Check current profile status
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, username, email_verified')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error(`⚠️  Error checking profile for ${user.email}:`, profileError.message);
          skippedCount++;
          continue;
        }

        if (!profile) {
          console.log(`⚠️  No profile found for ${user.email} (${user.id})`);
          skippedCount++;
          continue;
        }

        if (profile.email_verified === true) {
          // Already verified, skip
          skippedCount++;
          continue;
        }

        // Update profile
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            email_verified: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (updateError) {
          console.error(`❌ Error updating ${user.email}:`, updateError.message);
          skippedCount++;
          continue;
        }

        console.log(`✅ Fixed: ${user.email} (${profile.username || 'N/A'})`);
        fixedCount++;
      }

      console.log(`\n📊 Summary:`);
      console.log(`   ✅ Fixed: ${fixedCount} users`);
      console.log(`   ⏭️  Skipped: ${skippedCount} users`);
      console.log(`   📧 Total checked: ${confirmedUsers.length} users`);
    }

    console.log('\n✨ Email verification fix completed!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Get email from command line args
const email = process.argv[2] || null;

fixEmailVerified(email)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

