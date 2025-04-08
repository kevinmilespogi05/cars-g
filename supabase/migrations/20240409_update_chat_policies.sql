-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users can create chat rooms" ON chat_rooms;

-- Create updated policies for chat_rooms
CREATE POLICY "Users can view their chat rooms"
    ON chat_rooms FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM chat_participants
            WHERE chat_participants.room_id = chat_rooms.id
            AND chat_participants.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create chat rooms"
    ON chat_rooms FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL); 