-- Add likes and replies functionality to report_comments system
-- This migration adds the necessary tables and functions for likes and replies

-- Create report_comment_likes table
CREATE TABLE IF NOT EXISTS public.report_comment_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID NOT NULL REFERENCES public.report_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- Create report_comment_replies table
CREATE TABLE IF NOT EXISTS public.report_comment_replies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID NOT NULL REFERENCES public.report_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reply_text TEXT NOT NULL,
    parent_reply_id UUID REFERENCES public.report_comment_replies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE public.report_comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_comment_replies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for report_comment_likes
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'report_comment_likes' AND policyname = 'Users can view all comment likes') THEN
        CREATE POLICY "Users can view all comment likes" ON public.report_comment_likes
            FOR SELECT USING (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'report_comment_likes' AND policyname = 'Users can like comments') THEN
        CREATE POLICY "Users can like comments" ON public.report_comment_likes
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'report_comment_likes' AND policyname = 'Users can unlike their own likes') THEN
        CREATE POLICY "Users can unlike their own likes" ON public.report_comment_likes
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- RLS Policies for report_comment_replies
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'report_comment_replies' AND policyname = 'Users can view all replies') THEN
        CREATE POLICY "Users can view all replies" ON public.report_comment_replies
            FOR SELECT USING (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'report_comment_replies' AND policyname = 'Users can create replies') THEN
        CREATE POLICY "Users can create replies" ON public.report_comment_replies
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'report_comment_replies' AND policyname = 'Users can update their own replies') THEN
        CREATE POLICY "Users can update their own replies" ON public.report_comment_replies
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'report_comment_replies' AND policyname = 'Users can delete their own replies') THEN
        CREATE POLICY "Users can delete their own replies" ON public.report_comment_replies
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create function to get comment with likes and replies
CREATE OR REPLACE FUNCTION get_report_comment_with_details(comment_id UUID)
RETURNS TABLE (
    id UUID,
    report_id UUID,
    user_id UUID,
    comment TEXT,
    comment_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    user_profile JSONB,
    likes_count BIGINT,
    is_liked BOOLEAN,
    replies_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rc.id,
        rc.report_id,
        rc.user_id,
        rc.comment,
        rc.comment_type,
        rc.created_at,
        rc.updated_at,
        COALESCE(
            jsonb_build_object(
                'username', p.username,
                'avatar_url', p.avatar_url
            ),
            '{"username": "Unknown", "avatar_url": null}'::jsonb
        ) as user_profile,
        COALESCE(likes.likes_count, 0) as likes_count,
        CASE WHEN user_like.id IS NOT NULL THEN true ELSE false END as is_liked,
        COALESCE(replies.replies_count, 0) as replies_count
    FROM public.report_comments rc
    LEFT JOIN public.profiles p ON rc.user_id = p.id
    LEFT JOIN (
        SELECT comment_id, COUNT(*) as likes_count
        FROM public.report_comment_likes
        GROUP BY comment_id
    ) likes ON rc.id = likes.comment_id
    LEFT JOIN (
        SELECT comment_id, COUNT(*) as replies_count
        FROM public.report_comment_replies
        GROUP BY comment_id
    ) replies ON rc.id = replies.comment_id
    LEFT JOIN public.report_comment_likes user_like ON rc.id = user_like.comment_id AND user_like.user_id = auth.uid()
    WHERE rc.id = comment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get replies for a comment
CREATE OR REPLACE FUNCTION get_comment_replies(comment_id UUID)
RETURNS TABLE (
    id UUID,
    comment_id UUID,
    user_id UUID,
    reply_text TEXT,
    parent_reply_id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    user_profile JSONB,
    likes_count BIGINT,
    is_liked BOOLEAN,
    replies_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rcr.id,
        rcr.comment_id,
        rcr.user_id,
        rcr.reply_text,
        rcr.parent_reply_id,
        rcr.created_at,
        rcr.updated_at,
        COALESCE(
            jsonb_build_object(
                'username', p.username,
                'avatar_url', p.avatar_url
            ),
            '{"username": "Unknown", "avatar_url": null}'::jsonb
        ) as user_profile,
        0::BIGINT as likes_count, -- TODO: Add reply likes table
        false as is_liked, -- TODO: Add reply likes table
        0::BIGINT as replies_count -- TODO: Add nested replies
    FROM public.report_comment_replies rcr
    LEFT JOIN public.profiles p ON rcr.user_id = p.id
    WHERE rcr.comment_id = get_comment_replies.comment_id
    ORDER BY rcr.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_report_comment_with_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_comment_replies(UUID) TO authenticated;

-- Grant table permissions
GRANT SELECT, INSERT, DELETE ON public.report_comment_likes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_comment_replies TO authenticated;
