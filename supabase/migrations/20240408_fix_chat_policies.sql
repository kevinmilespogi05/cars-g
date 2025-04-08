-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users can create chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert messages in their rooms" ON chat_messages;
DROP POLICY IF EXISTS "Users can view participants in their rooms" ON chat_participants;
DROP POLICY IF EXISTS "Users can join rooms" ON chat_participants;
DROP POLICY IF EXISTS "Users can leave rooms" ON chat_participants;

-- Create a function to check if a user is a participant in a room
CREATE OR REPLACE FUNCTION is_participant(room_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_participants.room_id = $1
    AND chat_participants.user_id = $2
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new policies for chat_rooms
CREATE POLICY "Users can view their chat rooms"
    ON chat_rooms FOR SELECT
    USING (is_participant(id, auth.uid()));

CREATE POLICY "Users can create chat rooms"
    ON chat_rooms FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Create new policies for chat_messages
CREATE POLICY "Users can view messages in their rooms"
    ON chat_messages FOR SELECT
    USING (is_participant(room_id, auth.uid()));

CREATE POLICY "Users can insert messages in their rooms"
    ON chat_messages FOR INSERT
    WITH CHECK (is_participant(room_id, auth.uid()));

-- Create new policies for chat_participants
CREATE POLICY "Users can view participants in their rooms"
    ON chat_participants FOR SELECT
    USING (is_participant(room_id, auth.uid()));

CREATE POLICY "Users can join rooms"
    ON chat_participants FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave rooms"
    ON chat_participants FOR DELETE
    USING (user_id = auth.uid()); 