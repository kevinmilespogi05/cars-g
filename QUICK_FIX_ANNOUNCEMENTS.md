# Quick Fix for Announcements Table

## Problem
The announcements table is missing the `image_url` column, causing the error:
```
Could not find the 'image_url' column of 'announcements' in the schema cache
```

## Solution
Run this SQL command in your Supabase dashboard (SQL Editor):

```sql
-- Add image_url column to announcements table
ALTER TABLE public.announcements 
ADD COLUMN IF NOT EXISTS image_url TEXT;
```

## Steps to Fix
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Paste the SQL command above
4. Click "Run" to execute

## Alternative: Complete Table Recreation
If the table doesn't exist at all, run this complete SQL:

```sql
-- Drop and recreate announcements table with image_url column
DROP TABLE IF EXISTS public.announcements CASCADE;

CREATE TABLE public.announcements (
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

-- Create policies
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

-- Create indexes
CREATE INDEX idx_announcements_active ON public.announcements(is_active);
CREATE INDEX idx_announcements_priority ON public.announcements(priority);
CREATE INDEX idx_announcements_target_audience ON public.announcements(target_audience);
CREATE INDEX idx_announcements_created_at ON public.announcements(created_at DESC);
CREATE INDEX idx_announcements_expires_at ON public.announcements(expires_at);

-- Create trigger function
CREATE OR REPLACE FUNCTION update_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_announcements_updated_at
    BEFORE UPDATE ON public.announcements
    FOR EACH ROW
    EXECUTE FUNCTION update_announcements_updated_at();

-- Grant permissions
GRANT SELECT ON public.announcements TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
```

## Verification
After running the SQL, test the announcements feature to ensure it works correctly.
