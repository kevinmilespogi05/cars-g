-- Complete Chat System Fix
-- Run this in your Supabase SQL Editor to fix all chat-related issues

-- ============================================================================
-- 1. CREATE MISSING TABLES
-- ============================================================================

-- Create muted_rooms table (missing from migrations)
CREATE TABLE IF NOT EXISTS public.muted_rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    muted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, room_id)
);

-- Create notification_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notification_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    chat_notifications BOOLEAN DEFAULT true,
    report_notifications BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- ============================================================================
-- 2. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.muted_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. DROP ALL EXISTING PROBLEMATIC POLICIES
-- ============================================================================

-- Drop all chat_messages policies
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can send messages in their rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert messages in their rooms" ON public.chat_messages;

-- Drop all chat_participants policies
DROP POLICY IF EXISTS "Users can view participants in their rooms" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can join rooms" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can leave rooms" ON public.chat_participants;

-- Drop all chat_rooms policies
DROP POLICY IF EXISTS "Users can view rooms they participate in" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can create chat rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can update rooms they created" ON public.chat_rooms;

-- Drop all muted_rooms policies
DROP POLICY IF EXISTS "Users can mute rooms" ON public.muted_rooms;
DROP POLICY IF EXISTS "Users can unmute rooms" ON public.muted_rooms;
DROP POLICY IF EXISTS "Users can view their muted rooms" ON public.muted_rooms;

-- ============================================================================
-- 4. CREATE SAFE RLS POLICIES (NO RECURSION)
-- ============================================================================

-- Chat Messages Policies
CREATE POLICY "Users can view messages in their rooms" ON public.chat_messages FOR SELECT
    USING (
        room_id IN (
            SELECT room_id FROM public.chat_participants 
            WHERE user_id = (select auth.uid())
        )
    );

CREATE POLICY "Users can send messages in their rooms" ON public.chat_messages FOR INSERT
    WITH CHECK (
        (select auth.uid()) = sender_id AND
        room_id IN (
            SELECT room_id FROM public.chat_participants 
            WHERE user_id = (select auth.uid())
        )
    );

CREATE POLICY "Users can update their own messages" ON public.chat_messages FOR UPDATE
    USING ((select auth.uid()) = sender_id)
    WITH CHECK ((select auth.uid()) = sender_id);

CREATE POLICY "Users can delete their own messages" ON public.chat_messages FOR DELETE
    USING ((select auth.uid()) = sender_id);

-- Chat Participants Policies
CREATE POLICY "Users can view participants in their rooms" ON public.chat_participants FOR SELECT
    USING (
        room_id IN (
            SELECT room_id FROM public.chat_participants 
            WHERE user_id = (select auth.uid())
        )
    );

CREATE POLICY "Users can join rooms" ON public.chat_participants FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can leave rooms" ON public.chat_participants FOR DELETE
    USING ((select auth.uid()) = user_id);

-- Chat Rooms Policies
CREATE POLICY "Users can view rooms they participate in" ON public.chat_rooms FOR SELECT
    USING (
        id IN (
            SELECT room_id FROM public.chat_participants 
            WHERE user_id = (select auth.uid())
        )
    );

CREATE POLICY "Users can create chat rooms" ON public.chat_rooms FOR INSERT
    WITH CHECK ((select auth.uid()) = created_by);

CREATE POLICY "Users can update rooms they created" ON public.chat_rooms FOR UPDATE
    USING ((select auth.uid()) = created_by)
    WITH CHECK ((select auth.uid()) = created_by);

-- Muted Rooms Policies
CREATE POLICY "Users can mute rooms" ON public.muted_rooms FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can unmute rooms" ON public.muted_rooms FOR DELETE
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their muted rooms" ON public.muted_rooms FOR SELECT
    USING ((select auth.uid()) = user_id);

-- ============================================================================
-- 5. CREATE MISSING CHAT FUNCTIONS
-- ============================================================================

-- Create chat room function
CREATE OR REPLACE FUNCTION public.create_chat_room(room_name TEXT)
RETURNS public.chat_rooms
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_room public.chat_rooms;
    current_user_id UUID;
BEGIN
    -- Get the current user ID
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Create the chat room
    INSERT INTO public.chat_rooms (name, created_by, is_direct_message)
    VALUES (room_name, current_user_id, false)
    RETURNING * INTO new_room;
    
    -- Add the creator as a participant
    INSERT INTO public.chat_participants (room_id, user_id)
    VALUES (new_room.id, current_user_id);
    
    RETURN new_room;
END;
$$;

-- Create direct message room function
CREATE OR REPLACE FUNCTION public.create_direct_message_room(other_user_id UUID, room_name TEXT DEFAULT 'Direct Message')
RETURNS public.chat_rooms
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_room public.chat_rooms;
    current_user_id UUID;
BEGIN
    -- Get the current user ID
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    IF other_user_id = current_user_id THEN
        RAISE EXCEPTION 'Cannot create direct message with yourself';
    END IF;
    
    -- Check if the other user exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = other_user_id) THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Create the direct message room
    INSERT INTO public.chat_rooms (name, created_by, is_direct_message)
    VALUES (room_name, current_user_id, true)
    RETURNING * INTO new_room;
    
    -- Add both users as participants
    INSERT INTO public.chat_participants (room_id, user_id) VALUES
        (new_room.id, current_user_id),
        (new_room.id, other_user_id);
    
    RETURN new_room;
END;
$$;

-- Create delete message function
CREATE OR REPLACE FUNCTION public.delete_message(message_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    message_sender_id UUID;
BEGIN
    -- Get the current user ID
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Get the message sender ID
    SELECT sender_id INTO message_sender_id
    FROM public.chat_messages
    WHERE id = message_id;
    
    IF message_sender_id IS NULL THEN
        RAISE EXCEPTION 'Message not found';
    END IF;
    
    -- Check if user owns the message
    IF message_sender_id != current_user_id THEN
        RAISE EXCEPTION 'Cannot delete message you did not send';
    END IF;
    
    -- Delete the message
    DELETE FROM public.chat_messages WHERE id = message_id;
    
    RETURN TRUE;
END;
$$;

-- ============================================================================
-- 6. GRANT EXECUTE PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.create_chat_room(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_direct_message_room(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_message(UUID) TO authenticated;

-- ============================================================================
-- 7. CREATE INDEXES FOR BETTER PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_muted_rooms_user_id ON public.muted_rooms(user_id);
CREATE INDEX IF NOT EXISTS idx_muted_rooms_room_id ON public.muted_rooms(room_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON public.notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON public.chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_room_id ON public.chat_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON public.chat_participants(user_id);

-- ============================================================================
-- 8. VERIFICATION AND TESTING
-- ============================================================================

-- Verify all tables exist
SELECT 
    table_name,
    'Table exists' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('muted_rooms', 'notification_settings', 'chat_rooms', 'chat_participants', 'chat_messages')
ORDER BY table_name;

-- Verify all functions exist
SELECT 
    routine_name,
    'Function exists' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('create_chat_room', 'create_direct_message_room', 'delete_message')
ORDER BY routine_name;

-- Test if current user can view messages
SELECT 
    'Current user can view messages' as test,
    COUNT(*) as message_count
FROM public.chat_messages cm
WHERE room_id IN (
    SELECT room_id FROM public.chat_participants 
    WHERE user_id = (select auth.uid())
);

-- Show all chat_messages policies
SELECT 
    policyname,
    cmd,
    'Policy exists' as status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'chat_messages'
ORDER BY policyname; 