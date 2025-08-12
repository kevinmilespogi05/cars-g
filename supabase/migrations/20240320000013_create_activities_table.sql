-- Create activities table for tracking user activities
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('report_created', 'report_resolved', 'achievement_earned', 'points_earned')),
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    metadata JSONB DEFAULT NULL
);

-- Enable Row Level Security
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Drop policies that might already exist
DROP POLICY IF EXISTS "Users can view their own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can view all activities" ON public.activities;
DROP POLICY IF EXISTS "Users can insert their own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can update their own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can delete their own activities" ON public.activities;

-- Allow users to view their own activities
CREATE POLICY "Users can view their own activities"
    ON public.activities FOR SELECT
    USING (auth.uid() = user_id);

-- Allow users to view all activities (for social features)
CREATE POLICY "Users can view all activities"
    ON public.activities FOR SELECT
    USING (true);

-- Allow users to insert their own activities
CREATE POLICY "Users can insert their own activities"
    ON public.activities FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own activities
CREATE POLICY "Users can update their own activities"
    ON public.activities FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own activities
CREATE POLICY "Users can delete their own activities"
    ON public.activities FOR DELETE
    USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON public.activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON public.activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_type ON public.activities(type);

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated; 