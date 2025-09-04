-- Create announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    target_audience TEXT DEFAULT 'all' CHECK (target_audience IN ('all', 'users', 'patrols', 'admins')),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Drop policies that might already exist
DROP POLICY IF EXISTS "Everyone can view active announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;

-- Allow everyone to view active announcements
CREATE POLICY "Everyone can view active announcements"
    ON public.announcements FOR SELECT
    USING (
        is_active = true 
        AND (expires_at IS NULL OR expires_at > now())
        AND (
            target_audience = 'all' 
            OR (target_audience = 'users' AND EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role = 'user'
            ))
            OR (target_audience = 'patrols' AND EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role = 'patrol'
            ))
            OR (target_audience = 'admins' AND EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role = 'admin'
            ))
        )
    );

-- Allow admins to manage announcements
CREATE POLICY "Admins can manage announcements"
    ON public.announcements FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_announcements_active ON public.announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON public.announcements(priority);
CREATE INDEX IF NOT EXISTS idx_announcements_target_audience ON public.announcements(target_audience);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_expires_at ON public.announcements(expires_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_announcements_updated_at ON public.announcements;
CREATE TRIGGER update_announcements_updated_at
    BEFORE UPDATE ON public.announcements
    FOR EACH ROW
    EXECUTE FUNCTION update_announcements_updated_at();

-- Grant permissions to authenticated users
GRANT SELECT ON public.announcements TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
