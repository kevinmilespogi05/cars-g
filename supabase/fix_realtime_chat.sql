-- Enable real-time for chat_messages table
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Drop existing policies for chat_messages
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert messages in their rooms" ON chat_messages;

-- Create updated policies for chat_messages
CREATE POLICY "Users can view messages in their rooms"
    ON chat_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM chat_participants
            WHERE chat_participants.room_id = chat_messages.room_id
            AND chat_participants.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages in their rooms"
    ON chat_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_participants
            WHERE chat_participants.room_id = chat_messages.room_id
            AND chat_participants.user_id = auth.uid()
        )
    );

-- Create a function to create a chat room and add the creator as a participant
CREATE OR REPLACE FUNCTION create_chat_room(room_name TEXT, user_id UUID)
RETURNS chat_rooms
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_room chat_rooms;
BEGIN
  -- Create the room
  INSERT INTO chat_rooms (name)
  VALUES (room_name)
  RETURNING * INTO new_room;
  
  -- Add the creator as a participant
  INSERT INTO chat_participants (room_id, user_id)
  VALUES (new_room.id, user_id);
  
  RETURN new_room;
END;
$$; 