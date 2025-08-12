-- Create missing stored procedures for chat functionality
-- This migration adds the required functions that the chat service depends on

-- ============================================================================
-- 1. CREATE CHAT ROOM FUNCTION
-- ============================================================================

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

-- ============================================================================
-- 2. CREATE DIRECT MESSAGE ROOM FUNCTION
-- ============================================================================

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

-- ============================================================================
-- 3. DELETE MESSAGE FUNCTION
-- ============================================================================

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
-- 4. GRANT EXECUTE PERMISSIONS
-- ============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.create_chat_room(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_direct_message_room(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_message(UUID) TO authenticated;

-- ============================================================================
-- 5. VERIFICATION QUERY
-- ============================================================================

-- Run this query to verify the functions were created:
/*
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('create_chat_room', 'create_direct_message_room', 'delete_message')
ORDER BY routine_name;
*/ 