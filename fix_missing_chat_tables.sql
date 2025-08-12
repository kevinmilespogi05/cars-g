-- Fix missing chat tables and functions
-- Run this in your Supabase SQL Editor to resolve 404 and 400 errors

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

-- ============================================================================
-- 3. CREATE RLS POLICIES FOR NEW TABLES
-- ============================================================================

-- Muted Rooms Policies
DROP POLICY IF EXISTS "Users can mute rooms" ON public.muted_rooms;
DROP POLICY IF EXISTS "Users can unmute rooms" ON public.muted_rooms;
DROP POLICY IF EXISTS "Users can view their muted rooms" ON public.muted_rooms;

CREATE POLICY "Users can mute rooms"
    ON public.muted_rooms FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can unmute rooms"
    ON public.muted_rooms FOR DELETE
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their muted rooms"
    ON public.muted_rooms FOR SELECT
    USING ((select auth.uid()) = user_id);

-- Notification Settings Policies
DROP POLICY IF EXISTS "Users can view their notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Users can update their notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Users can insert their notification settings" ON public.notification_settings;

CREATE POLICY "Users can view their notification settings"
    ON public.notification_settings FOR SELECT
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their notification settings"
    ON public.notification_settings FOR UPDATE
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their notification settings"
    ON public.notification_settings FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

-- ============================================================================
-- 4. CREATE MISSING CHAT FUNCTIONS
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
-- 5. GRANT EXECUTE PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.create_chat_room(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_direct_message_room(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_message(UUID) TO authenticated;

-- ============================================================================
-- 6. CREATE INDEXES FOR BETTER PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_muted_rooms_user_id ON public.muted_rooms(user_id);
CREATE INDEX IF NOT EXISTS idx_muted_rooms_room_id ON public.muted_rooms(room_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON public.notification_settings(user_id);

-- ============================================================================
-- 7. VERIFICATION
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