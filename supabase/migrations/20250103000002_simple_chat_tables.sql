-- Simple chat tables creation without complex functions
-- This ensures the basic structure is created first

-- Drop existing tables if they exist (in case of conflicts)
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS admin_chats CASCADE;
DROP TABLE IF EXISTS chat_rooms CASCADE;

-- Create chat_messages table
CREATE TABLE chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin_chats table for tracking admin chat sessions
CREATE TABLE admin_chats (
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

-- Create chat_rooms table for managing chat sessions
CREATE TABLE chat_rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, admin_id)
);

-- Create indexes for better performance
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_receiver_id ON chat_messages(receiver_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX idx_chat_messages_sender_receiver ON chat_messages(sender_id, receiver_id);
CREATE INDEX idx_chat_messages_is_read ON chat_messages(is_read);

CREATE INDEX idx_admin_chats_user_id ON admin_chats(user_id);
CREATE INDEX idx_admin_chats_admin_id ON admin_chats(admin_id);
CREATE INDEX idx_admin_chats_is_active ON admin_chats(is_active);

CREATE INDEX idx_chat_rooms_user_id ON chat_rooms(user_id);
CREATE INDEX idx_chat_rooms_admin_id ON chat_rooms(admin_id);
CREATE INDEX idx_chat_rooms_is_active ON chat_rooms(is_active);

-- Enable Row Level Security
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies for chat_messages
CREATE POLICY "Users can read their own messages" ON chat_messages
    FOR SELECT USING (
        auth.uid() = sender_id OR 
        auth.uid() = receiver_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can send messages" ON chat_messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update received messages" ON chat_messages
    FOR UPDATE USING (auth.uid() = receiver_id);

-- Basic RLS Policies for admin_chats
CREATE POLICY "Users can read their admin chats" ON admin_chats
    FOR SELECT USING (
        auth.uid() = user_id OR 
        auth.uid() = admin_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can create admin chats" ON admin_chats
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update admin chats" ON admin_chats
    FOR UPDATE USING (
        auth.uid() = admin_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Basic RLS Policies for chat_rooms
CREATE POLICY "Users can read their chat rooms" ON chat_rooms
    FOR SELECT USING (
        auth.uid() = user_id OR 
        auth.uid() = admin_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can create chat rooms" ON chat_rooms
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update chat rooms" ON chat_rooms
    FOR UPDATE USING (
        auth.uid() = admin_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Grant necessary permissions
GRANT ALL ON chat_messages TO authenticated;
GRANT ALL ON admin_chats TO authenticated;
GRANT ALL ON chat_rooms TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
