-- Create reply_likes table for likes on comment replies
CREATE TABLE IF NOT EXISTS reply_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reply_id UUID REFERENCES comment_replies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(reply_id, user_id)
);

-- Enable RLS
ALTER TABLE reply_likes ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view all reply likes" ON reply_likes;
CREATE POLICY "Users can view all reply likes"
  ON reply_likes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can like replies" ON reply_likes;
CREATE POLICY "Authenticated users can like replies"
  ON reply_likes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can unlike their own reply likes" ON reply_likes;
CREATE POLICY "Users can unlike their own reply likes"
  ON reply_likes FOR DELETE
  USING (auth.uid() = user_id);
