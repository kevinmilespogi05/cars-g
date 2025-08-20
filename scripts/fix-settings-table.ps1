# Fix Settings Table Script
# This script creates the missing settings table in the Supabase database

$ErrorActionPreference = "Stop"

# Supabase configuration
$SUPABASE_URL = "https://mffuqdwqjdxbwpbhuxby.supabase.co"
$SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mZnVxZHdxamR4YndwYmh1eGJ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzkxMjg3MywiZXhwIjoyMDU5NDg4ODczfQ.VK8WhHWV1kElmQ-CvfqBhyzxO29MoBLz1peHCixb4dw"

# SQL to create settings table
$sql = @"
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
"@

Write-Host "Creating settings table in Supabase database..." -ForegroundColor Green

try {
    # Execute SQL using Supabase REST API
    $headers = @{
        "apikey" = $SERVICE_ROLE_KEY
        "Authorization" = "Bearer $SERVICE_ROLE_KEY"
        "Content-Type" = "application/json"
        "Prefer" = "return=minimal"
    }

    $body = @{
        query = $sql
    } | ConvertTo-Json -Depth 10

    $response = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/rpc/exec_sql" -Method POST -Headers $headers -Body $body

    Write-Host "Settings table created successfully!" -ForegroundColor Green
    Write-Host "The AdminSettings component should now work properly." -ForegroundColor Green

} catch {
    Write-Host "Error creating settings table: $($_.Exception.Message)" -ForegroundColor Red
    
    # Try alternative approach using direct SQL execution
    Write-Host "Trying alternative approach..." -ForegroundColor Yellow
    
    try {
        $body = @{
            query = $sql
        } | ConvertTo-Json -Depth 10

        $response = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/rpc/exec_sql" -Method POST -Headers $headers -Body $body -ErrorAction SilentlyContinue
        
        if ($response) {
            Write-Host "Settings table created successfully using alternative method!" -ForegroundColor Green
        } else {
            Write-Host "Please run the SQL manually in the Supabase dashboard:" -ForegroundColor Yellow
            Write-Host "1. Go to https://supabase.com/dashboard/project/mffuqdwqjdxbwpbhuxby" -ForegroundColor Yellow
            Write-Host "2. Navigate to SQL Editor" -ForegroundColor Yellow
            Write-Host "3. Run the SQL from create_settings_table.sql" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Alternative approach also failed. Please run the SQL manually in the Supabase dashboard." -ForegroundColor Red
        Write-Host "SQL file: create_settings_table.sql" -ForegroundColor Yellow
    }
}
