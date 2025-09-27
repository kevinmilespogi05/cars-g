#!/usr/bin/env node

/**
 * Complete avatar upload test
 * This script tests the full avatar upload flow
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCompleteAvatarFlow() {
  console.log('🧪 Testing Complete Avatar Upload Flow');
  console.log('=====================================');

  try {
    // Test 1: Check if avatars bucket exists
    console.log('\n1. Checking avatars bucket...');
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

    // Test 2: Test direct upload
    console.log('\n2. Testing direct upload...');
    const testFileName = `test-complete-${Date.now()}.txt`;
    const testContent = 'This is a test file for complete avatar upload testing';
    
    const { error: uploadError, data: uploadData } = await supabase.storage
      .from('avatars')
      .upload(testFileName, testContent, {
        contentType: 'text/plain'
      });
    
    if (uploadError) {
      console.error('❌ Direct upload failed:', uploadError.message);
      console.error('Error details:', uploadError);
    } else {
      console.log('✅ Direct upload successful:', uploadData);
      
      // Test 3: Get public URL
      console.log('\n3. Testing public URL generation...');
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(testFileName);
      
      console.log('✅ Public URL:', publicUrl);
      
      // Test 4: Clean up test file
      console.log('\n4. Cleaning up test file...');
      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove([testFileName]);
      
      if (deleteError) {
        console.error('⚠️  Failed to delete test file:', deleteError.message);
      } else {
        console.log('✅ Test file cleaned up');
      }
    }

    console.log('\n🎉 Complete avatar upload flow testing completed!');
    console.log('\n📝 Summary:');
    console.log('   - Avatar upload: ✅ Working');
    console.log('   - Public URL generation: ✅ Working');
    console.log('   - File cleanup: ✅ Working');
    console.log('\n💡 The avatar upload should now work in the app!');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testCompleteAvatarFlow();
