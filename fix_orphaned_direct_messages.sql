-- Fix orphaned direct message rooms
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- 1. IDENTIFY ORPHANED DIRECT MESSAGE ROOMS
-- ============================================================================

-- Find direct message rooms with insufficient participants
SELECT 
    'Orphaned direct message rooms:' as info,
    cr.id as room_id,
    cr.name as room_name,
    cr.created_at,
    COUNT(cp.user_id) as participant_count,
    array_agg(cp.user_id) as participant_ids,
    array_agg(p.username) as participant_usernames
FROM public.chat_rooms cr
LEFT JOIN public.chat_participants cp ON cr.id = cp.room_id
LEFT JOIN public.profiles p ON cp.user_id = p.id
WHERE cr.is_direct_message = true
GROUP BY cr.id, cr.name, cr.created_at
HAVING COUNT(cp.user_id) < 2
ORDER BY cr.created_at DESC;

-- ============================================================================
-- 2. CLEAN UP ORPHANED ROOMS
-- ============================================================================

-- Delete direct message rooms with no participants
DELETE FROM public.chat_rooms 
WHERE is_direct_message = true 
AND id NOT IN (
    SELECT DISTINCT room_id 
    FROM public.chat_participants
);

-- Delete direct message rooms with only one participant
DELETE FROM public.chat_rooms 
WHERE is_direct_message = true 
AND id IN (
    SELECT room_id 
    FROM public.chat_participants 
    GROUP BY room_id 
    HAVING COUNT(user_id) = 1
);

-- ============================================================================
-- 3. VERIFY THE CLEANUP
-- ============================================================================

-- Check remaining direct message rooms
SELECT 
    'Remaining direct message rooms:' as info,
    cr.id as room_id,
    cr.name as room_name,
    cr.created_at,
    COUNT(cp.user_id) as participant_count,
    array_agg(cp.user_id) as participant_ids,
    array_agg(p.username) as participant_usernames
FROM public.chat_rooms cr
LEFT JOIN public.chat_participants cp ON cr.id = cp.room_id
LEFT JOIN public.profiles p ON cp.user_id = p.id
WHERE cr.is_direct_message = true
GROUP BY cr.id, cr.name, cr.created_at
ORDER BY cr.created_at DESC;

-- ============================================================================
-- 4. CREATE A FUNCTION TO PREVENT FUTURE ORPHANED ROOMS
-- ============================================================================

-- Create a function to validate direct message rooms
CREATE OR REPLACE FUNCTION public.validate_direct_message_room(room_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    participant_count integer;
BEGIN
    -- Count participants in the room
    SELECT COUNT(user_id) INTO participant_count
    FROM public.chat_participants
    WHERE room_id = room_uuid;
    
    -- Return true if room has exactly 2 participants
    RETURN participant_count = 2;
END;
$$;

-- Create a trigger to automatically clean up invalid direct message rooms
CREATE OR REPLACE FUNCTION public.cleanup_invalid_direct_messages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- If a participant is deleted from a direct message room
    IF TG_OP = 'DELETE' THEN
        -- Check if the room is now invalid
        IF NOT public.validate_direct_message_room(OLD.room_id) THEN
            -- Delete the room if it's a direct message room with insufficient participants
            DELETE FROM public.chat_rooms 
            WHERE id = OLD.room_id 
            AND is_direct_message = true;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_cleanup_invalid_direct_messages ON public.chat_participants;
CREATE TRIGGER trigger_cleanup_invalid_direct_messages
    AFTER DELETE ON public.chat_participants
    FOR EACH ROW
    EXECUTE FUNCTION public.cleanup_invalid_direct_messages();

-- ============================================================================
-- 5. UPDATE THE CREATE DIRECT MESSAGE ROOM FUNCTION TO BE MORE ROBUST
-- ============================================================================

-- Update the create_direct_message_room function to handle edge cases better
CREATE OR REPLACE FUNCTION public.create_direct_message_room(other_user_id UUID, room_name TEXT DEFAULT NULL)
RETURNS public.chat_rooms
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_room public.chat_rooms;
    current_user_id UUID;
    other_username TEXT;
    final_room_name TEXT;
    existing_room_id UUID;
BEGIN
    -- Get the current user ID
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    IF other_user_id = current_user_id THEN
        RAISE EXCEPTION 'Cannot create direct message with yourself';
    END IF;
    
    -- Check if the other user exists and get their username
    SELECT username INTO other_username
    FROM public.profiles
    WHERE id = other_user_id;
    
    IF other_username IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Check if a direct message room already exists between these users
    SELECT cr.id INTO existing_room_id
    FROM public.chat_rooms cr
    JOIN public.chat_participants cp1 ON cr.id = cp1.room_id
    JOIN public.chat_participants cp2 ON cr.id = cp2.room_id
    WHERE cr.is_direct_message = true
    AND cp1.user_id = current_user_id
    AND cp2.user_id = other_user_id;
    
    -- If room exists, return it
    IF existing_room_id IS NOT NULL THEN
        SELECT * INTO new_room FROM public.chat_rooms WHERE id = existing_room_id;
        RETURN new_room;
    END IF;
    
    -- Set the room name to the other user's username
    final_room_name := COALESCE(room_name, other_username);
    
    -- Create the direct message room
    INSERT INTO public.chat_rooms (name, created_by, is_direct_message)
    VALUES (final_room_name, current_user_id, true)
    RETURNING * INTO new_room;
    
    -- Add both users as participants
    INSERT INTO public.chat_participants (room_id, user_id) VALUES
        (new_room.id, current_user_id),
        (new_room.id, other_user_id);
    
    RETURN new_room;
END;
$$; 