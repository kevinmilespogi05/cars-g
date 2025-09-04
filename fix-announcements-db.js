import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mffuqdwqjdxbwpbhuxby.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mZnVxZHdxamR4YndwYmh1eGJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzQ5NzAsImV4cCI6MjA1MDU1MDk3MH0.8QZqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZq';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAnnouncementsTable() {
  try {
    console.log('🔧 Fixing announcements table...');
    
    // Read the SQL file
    const sqlContent = fs.readFileSync('fix_announcements_image_url.sql', 'utf8');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      console.error('❌ Error executing SQL:', error);
      
      // Try alternative approach - check if table exists and add column
      console.log('🔄 Trying alternative approach...');
      
      // First, check if announcements table exists
      const { data: tableCheck, error: tableError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'announcements');
      
      if (tableError) {
        console.error('❌ Error checking table existence:', tableError);
        return;
      }
      
      if (tableCheck && tableCheck.length > 0) {
        console.log('✅ Announcements table exists');
        
        // Check if image_url column exists
        const { data: columnCheck, error: columnError } = await supabase
          .from('information_schema.columns')
          .select('column_name')
          .eq('table_schema', 'public')
          .eq('table_name', 'announcements')
          .eq('column_name', 'image_url');
        
        if (columnError) {
          console.error('❌ Error checking column existence:', columnError);
          return;
        }
        
        if (columnCheck && columnCheck.length > 0) {
          console.log('✅ image_url column already exists');
        } else {
          console.log('❌ image_url column does not exist - manual intervention required');
          console.log('Please run this SQL in your Supabase dashboard:');
          console.log('ALTER TABLE public.announcements ADD COLUMN image_url TEXT;');
        }
      } else {
        console.log('❌ Announcements table does not exist - manual intervention required');
        console.log('Please run the migration files in your Supabase dashboard:');
        console.log('- supabase/migrations/20250102000000_create_announcements_table.sql');
        console.log('- supabase/migrations/20250102000001_add_image_url_to_announcements.sql');
      }
    } else {
      console.log('✅ SQL executed successfully:', data);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the fix
fixAnnouncementsTable();
