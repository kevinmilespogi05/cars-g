import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function checkAdminUsers() {
  console.log('🔍 Checking for Admin Users...\n');

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Check all profiles for admin users
    console.log('📊 Checking all profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, email, role, created_at, is_banned')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('❌ Profiles fetch error:', profilesError);
      return;
    }

    console.log(`✅ Found ${profiles?.length || 0} profiles`);

    // Check for admin users
    const adminUsers = profiles?.filter(p => p.role === 'admin') || [];
    const regularUsers = profiles?.filter(p => p.role === 'user') || [];
    const otherRoles = profiles?.filter(p => p.role !== 'admin' && p.role !== 'user') || [];

    console.log('\n👑 Admin Users:', adminUsers.length);
    adminUsers.forEach(user => {
      console.log(`  - ${user.username} (${user.email}) - ID: ${user.id}`);
    });

    console.log('\n👤 Regular Users:', regularUsers.length);
    regularUsers.slice(0, 5).forEach(user => {
      console.log(`  - ${user.username} (${user.email}) - ID: ${user.id}`);
    });
    if (regularUsers.length > 5) {
      console.log(`  ... and ${regularUsers.length - 5} more`);
    }

    if (otherRoles.length > 0) {
      console.log('\n❓ Other Roles:', otherRoles.length);
      otherRoles.forEach(user => {
        console.log(`  - ${user.username} (${user.email}) - Role: ${user.role} - ID: ${user.id}`);
      });
    }

    // Check if we need to create an admin user
    if (adminUsers.length === 0) {
      console.log('\n⚠️  No admin users found!');
      console.log('You may need to create an admin user manually.');
      
      // Show how to create an admin user
      console.log('\n📝 To create an admin user, run this SQL:');
      console.log(`
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
      `);
    }

  } catch (error) {
    console.error('❌ General error:', error);
  }

  console.log('\n🏁 Check completed');
}

// Run the check
checkAdminUsers().catch(console.error);
