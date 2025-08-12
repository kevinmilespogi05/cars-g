-- Comprehensive fix for user_stats table schema
-- This migration ensures all required columns exist with proper structure

-- First, let's check what currently exists and drop the table if it's incomplete
DO $$ 
BEGIN
    -- Check if user_stats table exists and has the correct structure
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_stats'
    ) THEN
        -- Check if all required columns exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'user_stats' 
            AND column_name IN (
                'reports_submitted', 'reports_verified', 'reports_resolved',
                'days_active', 'total_points', 'last_active', 'total_reports',
                'resolved_reports', 'current_streak', 'longest_streak',
                'created_at', 'updated_at'
            )
        ) THEN
            -- Drop the incomplete table
            DROP TABLE IF EXISTS public.user_stats CASCADE;
            RAISE NOTICE 'Dropped incomplete user_stats table';
        END IF;
    END IF;
END $$;

-- Create the complete user_stats table with all required columns
CREATE TABLE IF NOT EXISTS public.user_stats (
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

-- Create trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS update_user_stats_updated_at ON public.user_stats;
CREATE TRIGGER update_user_stats_updated_at
    BEFORE UPDATE ON public.user_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create index for better join performance
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON public.user_stats(user_id);

-- Add comments for documentation
COMMENT ON TABLE public.user_stats IS 'User statistics and achievements tracking table';
COMMENT ON COLUMN public.user_stats.reports_submitted IS 'Total number of reports submitted by the user';
COMMENT ON COLUMN public.user_stats.reports_verified IS 'Total number of reports verified by moderators';
COMMENT ON COLUMN public.user_stats.reports_resolved IS 'Total number of reports resolved';
COMMENT ON COLUMN public.user_stats.days_active IS 'Total number of days the user has been active';
COMMENT ON COLUMN public.user_stats.total_points IS 'Total points earned by the user';
COMMENT ON COLUMN public.user_stats.last_active IS 'Timestamp of last user activity';
COMMENT ON COLUMN public.user_stats.total_reports IS 'Total number of reports (alias for reports_submitted)';
COMMENT ON COLUMN public.user_stats.resolved_reports IS 'Total number of resolved reports (alias for reports_resolved)';
COMMENT ON COLUMN public.user_stats.current_streak IS 'Current consecutive days active streak';
COMMENT ON COLUMN public.user_stats.longest_streak IS 'Longest consecutive days active streak achieved';

-- Verify the table structure
DO $$
DECLARE
    expected_columns text[] := ARRAY[
        'id', 'user_id', 'reports_submitted', 'reports_verified', 'reports_resolved',
        'days_active', 'total_points', 'last_active', 'total_reports', 'resolved_reports',
        'current_streak', 'longest_streak', 'created_at', 'updated_at'
    ];
    actual_columns text[];
    missing_columns text[];
BEGIN
    -- Get actual columns
    SELECT array_agg(column_name::text ORDER BY ordinal_position)
    INTO actual_columns
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_stats';
    
    -- Find missing columns
    SELECT array_agg(col)
    INTO missing_columns
    FROM unnest(expected_columns) AS col
    WHERE col != ALL(actual_columns);
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE EXCEPTION 'Missing columns in user_stats table: %', missing_columns;
    ELSE
        RAISE NOTICE 'user_stats table created successfully with all required columns';
    END IF;
END $$; 