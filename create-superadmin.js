#!/usr/bin/env node
/**
 * Script to create a superadmin account in Bantay SP
 * 
 * Usage:
 *   node create-superadmin.js <email> <password> [username]
 * 
 * Example:
 *   node create-superadmin.js superadmin@example.com MySecurePassword123 superadmin
 * 
 * Environment variables required:
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, 'server', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing environment variables');
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? 'SET' : 'NOT SET');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'SET' : 'NOT SET');
  console.error('\n📝 Please set these in server/.env');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function createSuperadmin() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('📖 Usage: node create-superadmin.js <email> <password> [username]');
    console.log('\nExample:');
    console.log('   node create-superadmin.js superadmin@example.com MySecurePassword123 superadmin');
    process.exit(1);
  }

  const email = args[0];
  const password = args[1];
  const username = args[2] || email.split('@')[0];

  // Validate inputs
  if (!email.includes('@')) {
    console.error('❌ Invalid email format');
    process.exit(1);
  }

  if (password.length < 6) {
    console.error('❌ Password must be at least 6 characters');
    process.exit(1);
  }

  console.log('\n🔐 Creating superadmin account...\n');
  console.log(`   Email:    ${email}`);
  console.log(`   Username: ${username}`);
  console.log(`   Role:     superadmin\n`);

  try {
    // Step 1: Create auth user
    console.log('📝 Step 1: Creating auth user...');
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        role: 'superadmin'
      }
    });

    if (authError || !authData.user) {
      console.error('❌ Failed to create auth user:', authError?.message || 'Unknown error');
      process.exit(1);
    }

    const userId = authData.user.id;
    console.log(`   ✅ Auth user created: ${userId}`);

    // Step 2: Create profile with superadmin role
    console.log('\n📝 Step 2: Creating superadmin profile...');
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        email,
        username,
        role: 'superadmin',
        first_name: '',
        last_name: '',
        points: 0,
        email_verified: true,
        created_at: new Date().toISOString()
      })
      .select('id, email, username, role')
      .single();

    if (profileError) {
      console.error('❌ Failed to create profile:', profileError.message);
      console.error('\n⚠️  Auth user was created but profile creation failed.');
      console.error('   You may need to manually delete the auth user and try again.');
      process.exit(1);
    }

    console.log(`   ✅ Profile created with role: ${profileData.role}`);

    // Step 3: Verify the superadmin was created
    console.log('\n📝 Step 3: Verifying superadmin access...');
    const { data: verifyData, error: verifyError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, username, role')
      .eq('id', userId)
      .single();

    if (verifyError || !verifyData) {
      console.error('❌ Failed to verify superadmin:', verifyError?.message || 'Profile not found');
      process.exit(1);
    }

    console.log(`   ✅ Superadmin verified:\n`);
    console.log(`       ID:       ${verifyData.id}`);
    console.log(`       Email:    ${verifyData.email}`);
    console.log(`       Username: ${verifyData.username}`);
    console.log(`       Role:     ${verifyData.role}\n`);

    console.log('✨ Superadmin created successfully!\n');
    console.log('📌 Next steps:');
    console.log('   1. Restart your server');
    console.log('   2. Log in with the email and password above');
    console.log(`   3. Navigate to User Management to confirm superadmin access\n`);

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

createSuperadmin();
