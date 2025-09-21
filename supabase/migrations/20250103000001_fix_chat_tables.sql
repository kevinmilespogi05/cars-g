-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read their own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can update received messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can read their admin chats" ON admin_chats;
DROP POLICY IF EXISTS "Users can create admin chats" ON admin_chats;
DROP POLICY IF EXISTS "Admins can update admin chats" ON admin_chats;
DROP POLICY IF EXISTS "Users can read their chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users can create chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Admins can update chat rooms" ON chat_rooms;

-- Drop triggers if they exist
DROP TRIGGER IF EXISTS update_chat_messages_updated_at ON chat_messages;
DROP TRIGGER IF EXISTS update_admin_chats_updated_at ON admin_chats;
DROP TRIGGER IF EXISTS update_chat_rooms_updated_at ON chat_rooms;
DROP TRIGGER IF EXISTS update_admin_chat_on_message_trigger ON chat_messages;

-- Drop functions if they exist
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS update_admin_chat_on_message();
DROP FUNCTION IF EXISTS get_admin_user_id();

-- Ensure tables exist with correct structure
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    last_message TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE,
    unread_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, admin_id)
);

CREATE TABLE IF NOT EXISTS chat_rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, admin_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver_id ON chat_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_receiver ON chat_messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_is_read ON chat_messages(is_read);

CREATE INDEX IF NOT EXISTS idx_admin_chats_user_id ON admin_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_chats_admin_id ON admin_chats(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_chats_is_active ON admin_chats(is_active);

CREATE INDEX IF NOT EXISTS idx_chat_rooms_user_id ON chat_rooms(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_admin_id ON chat_rooms(admin_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_is_active ON chat_rooms(is_active);

-- Enable Row Level Security
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_messages
-- Users can read messages where they are sender or receiver
CREATE POLICY "Users can read their own messages" ON chat_messages
    FOR SELECT USING (
        auth.uid() = sender_id OR 
        auth.uid() = receiver_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Users can insert messages where they are the sender
CREATE POLICY "Users can send messages" ON chat_messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Users can update messages they received (mark as read)
CREATE POLICY "Users can update received messages" ON chat_messages
    FOR UPDATE USING (auth.uid() = receiver_id);

-- RLS Policies for admin_chats
-- Users can read their own admin chats
CREATE POLICY "Users can read their admin chats" ON admin_chats
    FOR SELECT USING (
        auth.uid() = user_id OR 
        auth.uid() = admin_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Users can insert admin chats
CREATE POLICY "Users can create admin chats" ON admin_chats
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can update admin chats
CREATE POLICY "Admins can update admin chats" ON admin_chats
    FOR UPDATE USING (
        auth.uid() = admin_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for chat_rooms
-- Users can read their own chat rooms
CREATE POLICY "Users can read their chat rooms" ON chat_rooms
    FOR SELECT USING (
        auth.uid() = user_id OR 
        auth.uid() = admin_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Users can insert chat rooms
CREATE POLICY "Users can create chat rooms" ON chat_rooms
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can update chat rooms
CREATE POLICY "Admins can update chat rooms" ON chat_rooms
    FOR UPDATE USING (
        auth.uid() = admin_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_chat_messages_updated_at 
    BEFORE UPDATE ON chat_messages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_chats_updated_at 
    BEFORE UPDATE ON admin_chats 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_rooms_updated_at 
    BEFORE UPDATE ON chat_rooms 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to update admin_chats when new message is sent
CREATE OR REPLACE FUNCTION update_admin_chat_on_message()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert admin_chats record
    INSERT INTO admin_chats (user_id, admin_id, last_message, last_message_at, unread_count, is_active)
    VALUES (
        CASE WHEN NEW.sender_id = (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1) 
             THEN NEW.receiver_id 
             ELSE NEW.sender_id END,
        (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
        NEW.message,
        NEW.created_at,
        CASE WHEN NEW.sender_id = (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1) 
             THEN 0 
             ELSE 1 END,
        TRUE
    )
    ON CONFLICT (user_id, admin_id) 
    DO UPDATE SET
        last_message = NEW.message,
        last_message_at = NEW.created_at,
        unread_count = CASE 
            WHEN NEW.sender_id = (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1) 
            THEN 0 
            ELSE admin_chats.unread_count + 1 
        END,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update admin_chats when message is sent
CREATE TRIGGER update_admin_chat_on_message_trigger
    AFTER INSERT ON chat_messages
    FOR EACH ROW EXECUTE FUNCTION update_admin_chat_on_message();

-- Create function to get admin user ID
CREATE OR REPLACE FUNCTION get_admin_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1);
END;
$$ language 'plpgsql';

-- Grant necessary permissions
GRANT ALL ON chat_messages TO authenticated;
GRANT ALL ON admin_chats TO authenticated;
GRANT ALL ON chat_rooms TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
