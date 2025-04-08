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