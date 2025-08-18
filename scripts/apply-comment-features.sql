-- Apply comment likes and replies features
-- Run this script in your Supabase SQL editor

-- Create comment_likes table
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(comment_id, user_id)
);

-- Create comment_replies table
CREATE TABLE IF NOT EXISTS comment_replies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies for comment_likes
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all comment likes" ON comment_likes;
CREATE POLICY "Users can view all comment likes"
  ON comment_likes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can like comments" ON comment_likes;
CREATE POLICY "Authenticated users can like comments"
  ON comment_likes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can unlike their own comment likes" ON comment_likes;
CREATE POLICY "Users can unlike their own comment likes"
  ON comment_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Add RLS policies for comment_replies
ALTER TABLE comment_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all comment replies" ON comment_replies;
CREATE POLICY "Users can view all comment replies"
  ON comment_replies FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create comment replies" ON comment_replies;
CREATE POLICY "Authenticated users can create comment replies"
  ON comment_replies FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own comment replies" ON comment_replies;
CREATE POLICY "Users can update their own comment replies"
  ON comment_replies FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own comment replies" ON comment_replies;
CREATE POLICY "Users can delete their own comment replies"
  ON comment_replies FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for comment_replies updated_at
DROP TRIGGER IF EXISTS update_comment_replies_updated_at ON comment_replies;
CREATE TRIGGER update_comment_replies_updated_at
  BEFORE UPDATE ON comment_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verify tables were created
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('comment_likes', 'comment_replies')
ORDER BY table_name, ordinal_position;
