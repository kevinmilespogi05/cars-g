-- Create table for blocked users
CREATE TABLE IF NOT EXISTS blocked_users (
  blocker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (blocker_id, blocked_id)
);

-- Create table for muted rooms
CREATE TABLE IF NOT EXISTS muted_rooms (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (user_id, room_id)
);

-- Enable RLS
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE muted_rooms ENABLE ROW LEVEL SECURITY;

-- Create policies for blocked_users
CREATE POLICY "Users can view their blocked users"
  ON blocked_users FOR SELECT
  USING (blocker_id = auth.uid());

CREATE POLICY "Users can block other users"
  ON blocked_users FOR INSERT
  WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Users can unblock other users"
  ON blocked_users FOR DELETE
  USING (blocker_id = auth.uid());

-- Create policies for muted_rooms
CREATE POLICY "Users can view their muted rooms"
  ON muted_rooms FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can mute rooms"
  ON muted_rooms FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unmute rooms"
  ON muted_rooms FOR DELETE
  USING (user_id = auth.uid());

-- Add function to delete a message
CREATE OR REPLACE FUNCTION delete_message(message_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  message_exists BOOLEAN;
  is_sender BOOLEAN;
BEGIN
  -- Check if message exists and user is the sender
  SELECT 
    EXISTS(SELECT 1 FROM chat_messages WHERE id = message_id) INTO message_exists;
    
  SELECT 
    EXISTS(SELECT 1 FROM chat_messages WHERE id = message_id AND sender_id = auth.uid()) 
    INTO is_sender;
    
  -- Only allow deletion if user is the sender
  IF message_exists AND is_sender THEN
    DELETE FROM chat_messages WHERE id = message_id;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$; 