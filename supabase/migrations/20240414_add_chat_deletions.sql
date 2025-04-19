-- Create table for tracking chat deletions
CREATE TABLE IF NOT EXISTS chat_deletions (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (user_id, room_id)
);

-- Enable RLS
ALTER TABLE chat_deletions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own chat deletions"
  ON chat_deletions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete chats for themselves"
  ON chat_deletions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can restore chats for themselves"
  ON chat_deletions FOR DELETE
  USING (user_id = auth.uid());

-- Create index for better performance
CREATE INDEX IF NOT EXISTS chat_deletions_user_id_idx ON chat_deletions(user_id);
CREATE INDEX IF NOT EXISTS chat_deletions_room_id_idx ON chat_deletions(room_id); 