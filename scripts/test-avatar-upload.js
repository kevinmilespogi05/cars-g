#!/usr/bin/env node

/**
 * Test script for avatar upload functionality
 * This script tests the avatar upload process to ensure it works correctly
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration');
  console.error('SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('SUPABASE_ANON_KEY:', supabaseKey ? 'Set' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAvatarUpload() {
  console.log('🧪 Testing Avatar Upload Functionality');
  console.log('=====================================');

  try {
    // Test 1: Check if user is authenticated
    console.log('\n1. Checking authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Authentication error:', authError.message);
      return;
    }
    
    if (!user) {
      console.log('⚠️  No authenticated user found. Please log in first.');
      return;
    }
    
    console.log('✅ User authenticated:', user.id);

    // Test 2: Check avatars bucket exists
    console.log('\n2. Checking avatars bucket...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error('❌ Error listing buckets:', bucketError.message);
      return;
    }
    
    const avatarsBucket = buckets.find(bucket => bucket.id === 'avatars');
    if (!avatarsBucket) {
      console.error('❌ Avatars bucket not found');
      return;
    }
    
    console.log('✅ Avatars bucket exists:', avatarsBucket);

    // Test 3: Test upload with simple filename
    console.log('\n3. Testing upload with simple filename...');
    const testFileName = `test-${Date.now()}.txt`;
    const testContent = 'This is a test file for avatar upload testing';
    
    const { error: uploadError, data: uploadData } = await supabase.storage
      .from('avatars')
      .upload(testFileName, testContent, {
        contentType: 'text/plain'
      });
    
    if (uploadError) {
      console.error('❌ Upload failed:', uploadError.message);
      console.error('Error details:', uploadError);
    } else {
      console.log('✅ Upload successful:', uploadData);
      
      // Test 4: Get public URL
      console.log('\n4. Testing public URL generation...');
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(testFileName);
      
      console.log('✅ Public URL:', publicUrl);
      
      // Test 5: Clean up test file
      console.log('\n5. Cleaning up test file...');
      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove([testFileName]);
      
      if (deleteError) {
        console.error('⚠️  Failed to delete test file:', deleteError.message);
      } else {
        console.log('✅ Test file cleaned up');
      }
    }

    // Test 6: Test upload with user folder structure
    console.log('\n6. Testing upload with user folder structure...');
    const userFileName = `${user.id}/test-${Date.now()}.txt`;
    
    const { error: userUploadError, data: userUploadData } = await supabase.storage
      .from('avatars')
      .upload(userFileName, testContent, {
        contentType: 'text/plain'
      });
    
    if (userUploadError) {
      console.error('❌ User folder upload failed:', userUploadError.message);
      console.error('Error details:', userUploadError);
    } else {
      console.log('✅ User folder upload successful:', userUploadData);
      
      // Clean up user folder test file
      const { error: userDeleteError } = await supabase.storage
        .from('avatars')
        .remove([userFileName]);
      
      if (userDeleteError) {
        console.error('⚠️  Failed to delete user folder test file:', userDeleteError.message);
      } else {
        console.log('✅ User folder test file cleaned up');
      }
    }

    console.log('\n🎉 Avatar upload testing completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testAvatarUpload();
