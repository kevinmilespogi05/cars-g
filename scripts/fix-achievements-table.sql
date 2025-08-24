-- Fix Achievements Table Structure
-- This script will properly set up the achievements table with all required columns

-- First, let's check what columns currently exist
DO $$
BEGIN
    RAISE NOTICE 'Current achievements table structure:';
    RAISE NOTICE 'Columns: %', (
        SELECT string_agg(column_name, ', ')
        FROM information_schema.columns 
        WHERE table_name = 'achievements' 
        AND table_schema = 'public'
    );
END $$;

-- Drop the existing achievements table if it exists (this will also drop user_achievements due to foreign key)
DROP TABLE IF EXISTS public.user_achievements CASCADE;
DROP TABLE IF EXISTS public.achievements CASCADE;

-- Create the achievements table with all required columns
CREATE TABLE public.achievements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 0,
    icon TEXT,
    requirement_type TEXT NOT NULL,
    requirement_count INTEGER NOT NULL DEFAULT 1,
    criteria JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create the user_achievements table
CREATE TABLE public.user_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, achievement_id)
);

-- Insert the 5 achievements
INSERT INTO public.achievements (id, title, description, points, icon, requirement_type, requirement_count, criteria) VALUES
(
  'first_report',
  'First Report',
  'Submit your first community issue report',
  25,
  '📝',
  'reports_submitted',
  1,
  '{"reports_count": 1}'
),
(
  'reporting_streak',
  'Reporting Streak',
  'Submit reports for 7 consecutive days',
  100,
  '🔥',
  'days_active',
  7,
  '{"days_active": 7}'
),
(
  'verified_reporter',
  'Verified Reporter',
  'Have 5 reports verified by administrators',
  150,
  '✅',
  'reports_verified',
  5,
  '{"verified_reports": 5}'
),
(
  'community_champion',
  'Community Champion',
  'Earn 1000 total points',
  200,
  '🏆',
  'points_earned',
  1000,
  '{"total_points": 1000}'
),
(
  'problem_solver',
  'Problem Solver',
  'Have 10 reports resolved',
  300,
  '🔧',
  'reports_resolved',
  10,
  '{"resolved_reports": 10}'
);

-- Add constraint to ensure requirement_type is valid
ALTER TABLE public.achievements 
ADD CONSTRAINT achievements_requirement_type_check 
CHECK (requirement_type IN ('reports_submitted', 'reports_verified', 'reports_resolved', 'days_active', 'points_earned'));

-- Enable Row Level Security on achievements table
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- Allow all users to view achievements (for display purposes)
CREATE POLICY "Users can view all achievements"
    ON public.achievements FOR SELECT
    USING (true);

-- Allow admins to manage achievements
CREATE POLICY "Admins can manage achievements"
    ON public.achievements FOR ALL
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

-- Enable Row Level Security on user_achievements table
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own achievements
CREATE POLICY "Users can view their own achievements"
    ON public.user_achievements FOR SELECT
    USING (auth.uid() = user_id);

-- Allow users to view all user achievements (for social features)
CREATE POLICY "Users can view all user achievements"
    ON public.user_achievements FOR SELECT
    USING (true);

-- Allow users to insert their own achievements (when earned)
CREATE POLICY "Users can insert their own achievements"
    ON public.user_achievements FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow admins to manage user achievements
CREATE POLICY "Admins can manage user achievements"
    ON public.user_achievements FOR ALL
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
CREATE INDEX IF NOT EXISTS idx_achievements_requirement_type ON public.achievements(requirement_type);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON public.user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_earned_at ON public.user_achievements(earned_at DESC);

-- Grant permissions
GRANT SELECT ON public.achievements TO authenticated;
GRANT SELECT, INSERT ON public.user_achievements TO authenticated;

-- Verify the achievements were inserted
SELECT id, title, points, requirement_type, requirement_count FROM public.achievements ORDER BY points ASC;
