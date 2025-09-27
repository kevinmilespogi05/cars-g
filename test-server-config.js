// Test script to check server configuration
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mffuqdwqjdxbwpbhuxby.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Environment check:');
console.log('VITE_SUPABASE_URL:', supabaseUrl);
console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'SET' : 'NOT SET');

if (supabaseServiceKey) {
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  
  // Test admin connection
  try {
    const { data, error } = await supabaseAdmin.from('profiles').select('count').limit(1);
    if (error) {
      console.error('❌ Admin connection failed:', error.message);
    } else {
      console.log('✅ Admin connection successful');
    }
  } catch (err) {
    console.error('❌ Admin connection error:', err.message);
  }
} else {
  console.log('❌ No service role key available');
}
