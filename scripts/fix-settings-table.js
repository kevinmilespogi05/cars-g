import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = 'https://mffuqdwqjdxbwpbhuxby.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mZnVxZHdxamR4YndwYmh1eGJ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzkxMjg3MywiZXhwIjoyMDU5NDg4ODczfQ.VK8WhHWV1kElmQ-CvfqBhyzxO29MoBLz1peHCixb4dw';

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// SQL to create settings table
const sql = `
-- Create settings table for admin configuration
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read settings
CREATE POLICY "Admins can read settings" ON public.settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Only admins can update settings
CREATE POLICY "Admins can update settings" ON public.settings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Only admins can insert settings
CREATE POLICY "Admins can insert settings" ON public.settings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Only admins can delete settings
CREATE POLICY "Admins can delete settings" ON public.settings
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Insert default settings
INSERT INTO public.settings (id, key, value, created_at, updated_at) VALUES 
    ('0aaf67e4-bbcb-486a-a50c-2e7a9543a26f', 'report_settings', '{"max_points":100,"min_points":10}', '2025-04-06 13:55:05.935576+00', '2025-04-06 13:57:05.838+00'),
    ('36a053c5-667d-4bde-a9aa-7cda60fee1f1', 'notification_settings', '{"push_notifications":true,"email_notifications":true}', '2025-04-06 13:55:05.935576+00', '2025-04-06 13:57:05.768+00'),
    ('cf34830c-9a48-4a6e-a44a-b5db5ee7700c', 'system_settings', '{"maintenance_mode":false,"allow_new_registrations":true}', '2025-04-06 13:55:05.935576+00', '2025-04-06 13:57:05.919+00')
ON CONFLICT (key) DO NOTHING;
`;

async function createSettingsTable() {
    console.log('Creating settings table in Supabase database...');
    
    try {
        // Try to insert data directly - if table doesn't exist, it will fail
        const { error: insertError } = await supabase
            .from('settings')
            .upsert([
                {
                    id: '0aaf67e4-bbcb-486a-a50c-2e7a9543a26f',
                    key: 'report_settings',
                    value: { max_points: 100, min_points: 10 },
                    created_at: '2025-04-06 13:55:05.935576+00',
                    updated_at: '2025-04-06 13:57:05.838+00'
                },
                {
                    id: '36a053c5-667d-4bde-a9aa-7cda60fee1f1',
                    key: 'notification_settings',
                    value: { push_notifications: true, email_notifications: true },
                    created_at: '2025-04-06 13:55:05.935576+00',
                    updated_at: '2025-04-06 13:57:05.768+00'
                },
                {
                    id: 'cf34830c-9a48-4a6e-a44a-b5db5ee7700c',
                    key: 'system_settings',
                    value: { maintenance_mode: false, allow_new_registrations: true },
                    created_at: '2025-04-06 13:55:05.935576+00',
                    updated_at: '2025-04-06 13:57:05.919+00'
                }
            ], { onConflict: 'key' });
        
        if (insertError) {
            console.error('Error inserting data:', insertError);
            console.log('\nThe settings table does not exist. Please run the SQL manually in the Supabase dashboard:');
            console.log('1. Go to https://supabase.com/dashboard/project/mffuqdwqjdxbwpbhuxby');
            console.log('2. Navigate to SQL Editor');
            console.log('3. Run the SQL from create_settings_table.sql');
            console.log('\nSQL to run:');
            console.log(sql);
        } else {
            console.log('Settings table exists and data inserted successfully!');
            console.log('The AdminSettings component should now work properly.');
        }
        
    } catch (error) {
        console.error('Failed to create settings table:', error);
        console.log('\nPlease run the SQL manually in the Supabase dashboard:');
        console.log('1. Go to https://supabase.com/dashboard/project/mffuqdwqjdxbwpbhuxby');
        console.log('2. Navigate to SQL Editor');
        console.log('3. Run the SQL from create_settings_table.sql');
    }
}

createSettingsTable();
