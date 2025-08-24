import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Test script to debug statistics data fetching
async function testStatistics() {
  console.log('🔍 Testing Statistics Data Fetching...\n');

  // Check environment variables
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    console.log('VITE_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
    console.log('VITE_SUPABASE_ANON_KEY:', supabaseKey ? '✅ Set' : '❌ Missing');
    
    // Try to read from .env as fallback
    console.log('\n📖 Trying to read from .env file...');
    try {
      const envContent = fs.readFileSync('.env', 'utf8');
      const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)/);
      const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/);
      
      if (urlMatch && keyMatch) {
        console.log('✅ Found credentials in .env file');
        const fallbackUrl = urlMatch[1];
        const fallbackKey = keyMatch[1];
        
        // Test with fallback credentials
        await testWithCredentials(fallbackUrl, fallbackKey);
        return;
      }
    } catch (e) {
      console.log('❌ Could not read .env file');
    }
    
    return;
  }

  console.log('✅ Environment variables found');
  await testWithCredentials(supabaseUrl, supabaseKey);
}

async function testWithCredentials(url, key) {
  const supabase = createClient(url, key);

  try {
    // Test reports table
    console.log('\n📊 Testing Reports Table...');
    const { data: reports, error: reportsError } = await supabase
      .from('reports')
      .select('*')
      .limit(5);

    if (reportsError) {
      console.error('❌ Reports fetch error:', reportsError);
    } else {
      console.log(`✅ Reports fetched: ${reports?.length || 0} records`);
      if (reports && reports.length > 0) {
        console.log('Sample report:', {
          id: reports[0].id,
          status: reports[0].status,
          category: reports[0].category,
          location_address: reports[0].location_address,
          created_at: reports[0].created_at,
          updated_at: reports[0].updated_at
        });
      }
    }

    // Test profiles table
    console.log('\n👥 Testing Profiles Table...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);

    if (profilesError) {
      console.error('❌ Profiles fetch error:', profilesError);
    } else {
      console.log(`✅ Profiles fetched: ${profiles?.length || 0} records`);
      if (profiles && profiles.length > 0) {
        console.log('Sample profile:', {
          id: profiles[0].id,
          is_banned: profiles[0].is_banned,
          created_at: profiles[0].created_at
        });
      }
    }

    // Test with date filtering
    console.log('\n📅 Testing Date Filtering...');
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    console.log('Date range:', {
      from: weekAgo.toISOString(),
      to: now.toISOString()
    });

    const { data: filteredReports, error: filteredError } = await supabase
      .from('reports')
      .select('*')
      .gte('created_at', weekAgo.toISOString())
      .lte('created_at', now.toISOString());

    if (filteredError) {
      console.error('❌ Filtered reports fetch error:', filteredError);
    } else {
      console.log(`✅ Filtered reports: ${filteredReports?.length || 0} records`);
    }

    // Test table structure
    console.log('\n🏗️ Testing Table Structure...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('reports')
      .select('*')
      .limit(0);

    if (tableError) {
      console.error('❌ Table structure error:', tableError);
    } else {
      console.log('✅ Table structure accessible');
    }

  } catch (error) {
    console.error('❌ General error:', error);
  }

  console.log('\n🏁 Test completed');
}

// Run the test
testStatistics().catch(console.error);
