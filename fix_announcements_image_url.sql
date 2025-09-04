-- Fix announcements table by adding image_url column if it doesn't exist
-- This is a safe operation that won't break if the column already exists

-- First, check if the announcements table exists and add image_url column
DO $$ 
BEGIN
    -- Check if the announcements table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'announcements') THEN
        -- Add image_url column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'announcements' AND column_name = 'image_url') THEN
            ALTER TABLE public.announcements ADD COLUMN image_url TEXT;
            RAISE NOTICE 'Added image_url column to announcements table';
        ELSE
            RAISE NOTICE 'image_url column already exists in announcements table';
        END IF;
    ELSE
        RAISE NOTICE 'announcements table does not exist, creating it...';
        
        -- Create the announcements table
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
        
        RAISE NOTICE 'Created announcements table with image_url column';
    END IF;
END $$;
