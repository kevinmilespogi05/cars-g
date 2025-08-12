-- Add missing columns to existing achievements table
ALTER TABLE public.achievements 
ADD COLUMN IF NOT EXISTS requirement_type TEXT,
ADD COLUMN IF NOT EXISTS requirement_count INTEGER;

-- Update existing achievements with requirement_type and requirement_count based on criteria
UPDATE public.achievements 
SET 
    requirement_type = CASE 
        WHEN criteria::jsonb ? 'resolved_reports' THEN 'reports_resolved'
        WHEN criteria::jsonb ? 'reports_count' THEN 'reports_submitted'
        ELSE 'reports_submitted'
    END,
    requirement_count = CASE 
        WHEN criteria::jsonb ? 'resolved_reports' THEN (criteria::jsonb->>'resolved_reports')::integer
        WHEN criteria::jsonb ? 'reports_count' THEN (criteria::jsonb->>'reports_count')::integer
        ELSE 1
    END
WHERE requirement_type IS NULL OR requirement_count IS NULL;

-- Add constraint to ensure requirement_type is valid
ALTER TABLE public.achievements 
ADD CONSTRAINT achievements_requirement_type_check 
CHECK (requirement_type IN ('reports_submitted', 'reports_verified', 'reports_resolved', 'days_active', 'points_earned'));

-- Create user_achievements table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, achievement_id)
);

-- Enable Row Level Security on achievements table
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- Drop policies that might already exist for achievements
DROP POLICY IF EXISTS "Users can view all achievements" ON public.achievements;
DROP POLICY IF EXISTS "Admins can manage achievements" ON public.achievements;

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

-- Drop policies that might already exist for user_achievements
DROP POLICY IF EXISTS "Users can view their own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can view all user achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can insert their own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Admins can manage user achievements" ON public.user_achievements;

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