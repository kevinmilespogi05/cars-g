// Quick fix script to create verification requests for existing pending users
// Run this script to backfill verification requests

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mffuqdwqjdxbwpbhuxby.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixVerificationRequests() {
  try {
    console.log('🔍 Checking for users with pending verification status...');
    
    // Get all users with pending verification status
    const { data: pendingUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, username, email, verification_status, id_front_image_url, id_back_image_url, created_at')
      .eq('verification_status', 'pending');

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    console.log(`📊 Found ${pendingUsers.length} users with pending verification status`);

    if (pendingUsers.length === 0) {
      console.log('✅ No users need verification requests created');
      return;
    }

    // Check which users already have verification requests
    const { data: existingRequests, error: requestsError } = await supabase
      .from('user_verification_requests')
      .select('user_id');

    if (requestsError) {
      console.error('❌ Error fetching existing requests:', requestsError);
      return;
    }

    const existingUserIds = new Set(existingRequests.map(req => req.user_id));
    const usersNeedingRequests = pendingUsers.filter(user => !existingUserIds.has(user.id));

    console.log(`📝 ${usersNeedingRequests.length} users need verification requests created`);

    if (usersNeedingRequests.length === 0) {
      console.log('✅ All users already have verification requests');
      return;
    }

    // Create verification requests for users who need them
    const requestsToCreate = usersNeedingRequests
      .filter(user => user.id_front_image_url && user.id_back_image_url)
      .map(user => ({
        user_id: user.id,
        id_front_image_url: user.id_front_image_url,
        id_back_image_url: user.id_back_image_url,
        status: 'pending',
        created_at: user.created_at
      }));

    if (requestsToCreate.length === 0) {
      console.log('⚠️  No users have both ID images, cannot create verification requests');
      return;
    }

    console.log(`🔄 Creating ${requestsToCreate.length} verification requests...`);

    const { data: createdRequests, error: createError } = await supabase
      .from('user_verification_requests')
      .insert(requestsToCreate)
      .select();

    if (createError) {
      console.error('❌ Error creating verification requests:', createError);
      return;
    }

    console.log(`✅ Successfully created ${createdRequests.length} verification requests`);
    
    // Show summary
    console.log('\n📋 Summary:');
    console.log(`- Total pending users: ${pendingUsers.length}`);
    console.log(`- Users with existing requests: ${pendingUsers.length - usersNeedingRequests.length}`);
    console.log(`- Users needing requests: ${usersNeedingRequests.length}`);
    console.log(`- Users with ID images: ${requestsToCreate.length}`);
    console.log(`- Requests created: ${createdRequests.length}`);

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

fixVerificationRequests();
