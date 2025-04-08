-- Create chat rooms table
CREATE TABLE chat_rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create chat messages table
CREATE TABLE chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create chat room participants table
CREATE TABLE chat_participants (
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (room_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;

-- Create policies for chat_rooms
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

-- Create policies for chat_messages
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

-- Create policies for chat_participants
CREATE POLICY "Users can view participants in their rooms"
    ON chat_participants FOR SELECT
    USING (
        room_id IN (
            SELECT room_id FROM chat_participants
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can join rooms"
    ON chat_participants FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave rooms"
    ON chat_participants FOR DELETE
    USING (user_id = auth.uid());

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_chat_rooms_updated_at
    BEFORE UPDATE ON chat_rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at
    BEFORE UPDATE ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 