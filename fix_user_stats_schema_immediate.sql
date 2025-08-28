-- Immediate fix for user_stats table schema to match code expectations
-- Run this in your Supabase SQL Editor

-- First, let's check what currently exists
SELECT 'Current table structure:' as info;
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'user_stats';

-- Check if user_stats table exists and what columns it has
SELECT 'Current columns (if table exists):' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_stats'
ORDER BY ordinal_position;

-- Drop the existing user_stats table if it exists (since it seems to be incomplete)
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

-- Add RLS policies for user_stats
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- Drop policies that might already exist
DROP POLICY IF EXISTS "Users can view their own stats" ON public.user_stats;
DROP POLICY IF EXISTS "Users can view all user stats" ON public.user_stats;
DROP POLICY IF EXISTS "Users can update their own stats" ON public.user_stats;
DROP POLICY IF EXISTS "Users can insert their own stats" ON public.user_stats;

-- Allow users to view their own stats
CREATE POLICY "Users can view their own stats"
    ON public.user_stats FOR SELECT
    USING (auth.uid() = user_id);

-- Allow users to view other users' stats (for leaderboard)
CREATE POLICY "Users can view all user stats"
    ON public.user_stats FOR SELECT
    USING (true);

-- Allow users to update their own stats
CREATE POLICY "Users can update their own stats"
    ON public.user_stats FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Allow users to insert their own stats
CREATE POLICY "Users can insert their own stats"
    ON public.user_stats FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp (if the function exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE TRIGGER update_user_stats_updated_at
            BEFORE UPDATE ON public.user_stats
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Create index for better join performance
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON public.user_stats(user_id);

-- Add comments for documentation
COMMENT ON TABLE public.user_stats IS 'User statistics and achievements tracking';
COMMENT ON COLUMN public.user_stats.reports_submitted IS 'Total number of reports submitted by the user';
COMMENT ON COLUMN public.user_stats.reports_verified IS 'Total number of reports verified by authorities';
COMMENT ON COLUMN public.user_stats.reports_resolved IS 'Total number of reports resolved';
COMMENT ON COLUMN public.user_stats.days_active IS 'Total number of days the user has been active';
COMMENT ON COLUMN public.user_stats.total_points IS 'Total points earned by the user';
COMMENT ON COLUMN public.user_stats.last_active IS 'Last time the user was active';
COMMENT ON COLUMN public.user_stats.total_reports IS 'Total number of reports submitted by the user (alias for reports_submitted)';
COMMENT ON COLUMN public.user_stats.resolved_reports IS 'Total number of reports resolved by the user (alias for reports_resolved)';
COMMENT ON COLUMN public.user_stats.current_streak IS 'Current consecutive days active streak';
COMMENT ON COLUMN public.user_stats.longest_streak IS 'Longest consecutive days active streak achieved';

-- Verify the final table structure
SELECT 'Final table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_stats'
ORDER BY ordinal_position;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.user_stats TO authenticated;
