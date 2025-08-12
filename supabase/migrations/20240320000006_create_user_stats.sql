-- Create user_stats table
CREATE TABLE IF NOT EXISTS public.user_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reports_submitted INTEGER DEFAULT 0 NOT NULL,
    reports_verified INTEGER DEFAULT 0 NOT NULL,
    reports_resolved INTEGER DEFAULT 0 NOT NULL,
    days_active INTEGER DEFAULT 0 NOT NULL,
    total_points INTEGER DEFAULT 0 NOT NULL,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
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