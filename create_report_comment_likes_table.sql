-- Create a separate likes table for report comments
-- This avoids the foreign key constraint issue with the existing comment_likes table

-- Create report_comment_likes table
CREATE TABLE IF NOT EXISTS public.report_comment_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID NOT NULL REFERENCES public.report_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- Enable RLS
ALTER TABLE public.report_comment_likes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all report comment likes" ON public.report_comment_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can like report comments" ON public.report_comment_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own report comment likes" ON public.report_comment_likes
    FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON public.report_comment_likes TO authenticated;
