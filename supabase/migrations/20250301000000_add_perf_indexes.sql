-- Performance indexes for frequently filtered columns
-- Safe to re-run with IF NOT EXISTS guards

-- Reports
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports (user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports (status);
CREATE INDEX IF NOT EXISTS idx_reports_category ON public.reports (category);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports (created_at DESC);

-- Likes (report likes)
CREATE INDEX IF NOT EXISTS idx_likes_report_id ON public.likes (report_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON public.likes (user_id);

-- Comments
CREATE INDEX IF NOT EXISTS idx_comments_report_id ON public.comments (report_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments (user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments (created_at DESC);

-- Comment likes
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON public.comment_likes (comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON public.comment_likes (user_id);

-- Replies
CREATE INDEX IF NOT EXISTS idx_comment_replies_parent_comment_id ON public.comment_replies (parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_replies_parent_reply_id ON public.comment_replies (parent_reply_id);
CREATE INDEX IF NOT EXISTS idx_comment_replies_user_id ON public.comment_replies (user_id);
CREATE INDEX IF NOT EXISTS idx_comment_replies_created_at ON public.comment_replies (created_at DESC);

-- Reply likes
CREATE INDEX IF NOT EXISTS idx_reply_likes_reply_id ON public.reply_likes (reply_id);
CREATE INDEX IF NOT EXISTS idx_reply_likes_user_id ON public.reply_likes (user_id);

