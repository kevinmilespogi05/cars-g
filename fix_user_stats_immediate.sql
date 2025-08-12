-- Immediate fix for user_stats table schema
-- Run this in your Supabase SQL Editor

-- Drop the existing incomplete table
DROP TABLE IF EXISTS public.user_stats CASCADE;

-- Create the complete user_stats table with all required columns
CREATE TABLE public.user_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    reports_submitted INTEGER DEFAULT 0 NOT NULL,
    reports_verified INTEGER DEFAULT 0 NOT NULL,
    reports_resolved INTEGER DEFAULT 0 NOT NULL,
    days_active INTEGER DEFAULT 0 NOT NULL,
    total_points INTEGER DEFAULT 0 NOT NULL,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    total_reports INTEGER DEFAULT 0 NOT NULL,
    resolved_reports INTEGER DEFAULT 0 NOT NULL,
    current_streak INTEGER DEFAULT 0 NOT NULL,
    longest_streak INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own stats"
    ON public.user_stats FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view all user stats"
    ON public.user_stats FOR SELECT
    USING (true);

CREATE POLICY "Users can update their own stats"
    ON public.user_stats FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stats"
    ON public.user_stats FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create index
CREATE INDEX idx_user_stats_user_id ON public.user_stats(user_id);

-- Verify the table structure
SELECT 'Table created successfully' as status;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_stats'
ORDER BY ordinal_position; 