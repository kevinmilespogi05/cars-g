-- Add foreign key relationships for reports
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_reports_user'
    ) THEN
        ALTER TABLE reports
        ADD CONSTRAINT fk_reports_user
        FOREIGN KEY (user_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key relationships for profiles
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_profiles_user'
    ) THEN
        ALTER TABLE profiles
        ADD CONSTRAINT fk_profiles_user
        FOREIGN KEY (id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key relationships for comments
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_comments_user'
    ) THEN
        ALTER TABLE comments
        ADD CONSTRAINT fk_comments_user
        FOREIGN KEY (user_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key relationships for likes
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_likes_user'
    ) THEN
        ALTER TABLE likes
        ADD CONSTRAINT fk_likes_user
        FOREIGN KEY (user_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- Drop existing views if they exist
DROP VIEW IF EXISTS report_details;
DROP VIEW IF EXISTS comment_details;

-- Create view for report details with user info
CREATE VIEW report_details AS
SELECT 
  r.*,
  json_build_object(
    'username', COALESCE(p.username, 'Unknown'),
    'avatar_url', COALESCE(p.avatar_url, '')
  ) as user,
  COALESCE((SELECT COUNT(*) FROM likes WHERE report_id = r.id), 0) as likes_count,
  COALESCE((SELECT COUNT(*) FROM comments WHERE report_id = r.id), 0) as comments_count
FROM reports r
LEFT JOIN profiles p ON r.user_id = p.id;

-- Create view for comment details with user info
CREATE VIEW comment_details AS
SELECT 
  c.*,
  json_build_object(
    'username', COALESCE(p.username, 'Unknown'),
    'avatar_url', COALESCE(p.avatar_url, '')
  ) as user
FROM comments c
LEFT JOIN profiles p ON c.user_id = p.id;

-- Grant access to views
GRANT SELECT ON report_details TO authenticated;
GRANT SELECT ON comment_details TO authenticated;

-- Add RLS policies for likes
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'likes' AND policyname = 'Users can view all likes'
    ) THEN
        CREATE POLICY "Users can view all likes"
        ON likes FOR SELECT
        USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'likes' AND policyname = 'Authenticated users can like reports'
    ) THEN
        CREATE POLICY "Authenticated users can like reports"
        ON likes FOR INSERT
        WITH CHECK (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'likes' AND policyname = 'Users can unlike their own likes'
    ) THEN
        CREATE POLICY "Users can unlike their own likes"
        ON likes FOR DELETE
        USING (auth.uid() = user_id);
    END IF;
END $$; 