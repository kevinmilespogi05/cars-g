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
