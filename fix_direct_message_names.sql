-- Fix direct message room names to show actual usernames
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- 1. DIAGNOSE THE CURRENT DIRECT MESSAGE ROOMS
-- ============================================================================

-- Check current direct message rooms and their participants
SELECT 
    'Current direct message rooms:' as info,
    cr.id as room_id,
    cr.name as room_name,
    cr.is_direct_message,
    cr.created_at,
    array_agg(cp.user_id) as participant_ids,
    array_agg(p.username) as participant_usernames
FROM public.chat_rooms cr
JOIN public.chat_participants cp ON cr.id = cp.room_id
LEFT JOIN public.profiles p ON cp.user_id = p.id
WHERE cr.is_direct_message = true
GROUP BY cr.id, cr.name, cr.is_direct_message, cr.created_at
ORDER BY cr.created_at DESC;

-- ============================================================================
-- 2. UPDATE EXISTING DIRECT MESSAGE ROOM NAMES
-- ============================================================================

-- Update existing direct message rooms to show the other participant's username
UPDATE public.chat_rooms 
SET name = (
    SELECT p.username 
    FROM public.chat_participants cp
    JOIN public.profiles p ON cp.user_id = p.id
    WHERE cp.room_id = chat_rooms.id 
    AND cp.user_id != chat_rooms.created_by
    LIMIT 1
)
WHERE is_direct_message = true 
AND name = 'Direct Message';

-- ============================================================================
-- 3. CREATE A FUNCTION TO PROPERLY NAME DIRECT MESSAGE ROOMS
-- ============================================================================

-- Create a function that automatically names direct message rooms
CREATE OR REPLACE FUNCTION public.update_direct_message_room_names()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    room_record RECORD;
    other_username TEXT;
BEGIN
    -- Loop through all direct message rooms
    FOR room_record IN 
        SELECT cr.id, cr.created_by
        FROM public.chat_rooms cr
        WHERE cr.is_direct_message = true
    LOOP
        -- Get the other participant's username
        SELECT p.username INTO other_username
        FROM public.chat_participants cp
        JOIN public.profiles p ON cp.user_id = p.id
        WHERE cp.room_id = room_record.id 
        AND cp.user_id != room_record.created_by
        LIMIT 1;
        
        -- Update the room name if we found a username
        IF other_username IS NOT NULL THEN
            UPDATE public.chat_rooms 
            SET name = other_username
            WHERE id = room_record.id;
        END IF;
    END LOOP;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_direct_message_room_names() TO authenticated;

-- ============================================================================
-- 4. CREATE A TRIGGER TO AUTO-UPDATE ROOM NAMES
-- ============================================================================

-- Create a trigger function to automatically update room names when participants are added
CREATE OR REPLACE FUNCTION public.update_room_name_on_participant_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    room_record RECORD;
    other_username TEXT;
BEGIN
    -- Get the room details
    SELECT * INTO room_record
    FROM public.chat_rooms
    WHERE id = NEW.room_id;
    
    -- Only update if it's a direct message room
    IF room_record.is_direct_message THEN
        -- Get the other participant's username
        SELECT p.username INTO other_username
        FROM public.chat_participants cp
        JOIN public.profiles p ON cp.user_id = p.id
        WHERE cp.room_id = NEW.room_id 
        AND cp.user_id != room_record.created_by
        LIMIT 1;
        
        -- Update the room name if we found a username
        IF other_username IS NOT NULL THEN
            UPDATE public.chat_rooms 
            SET name = other_username
            WHERE id = NEW.room_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_update_room_name ON public.chat_participants;
CREATE TRIGGER trigger_update_room_name
    AFTER INSERT ON public.chat_participants
    FOR EACH ROW
    EXECUTE FUNCTION public.update_room_name_on_participant_change();

-- ============================================================================
-- 5. UPDATE THE CREATE DIRECT MESSAGE ROOM FUNCTION
-- ============================================================================

-- Update the create_direct_message_room function to set the proper name
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

-- ============================================================================
-- 6. RUN THE UPDATE FUNCTION
-- ============================================================================

-- Run the function to update all existing direct message room names
SELECT public.update_direct_message_room_names();

-- ============================================================================
-- 7. VERIFY THE FIXES
-- ============================================================================

-- Check the updated direct message rooms
SELECT 
    'Updated direct message rooms:' as info,
    cr.id as room_id,
    cr.name as room_name,
    cr.is_direct_message,
    cr.created_at,
    array_agg(cp.user_id) as participant_ids,
    array_agg(p.username) as participant_usernames
FROM public.chat_rooms cr
JOIN public.chat_participants cp ON cr.id = cp.room_id
LEFT JOIN public.profiles p ON cp.user_id = p.id
WHERE cr.is_direct_message = true
GROUP BY cr.id, cr.name, cr.is_direct_message, cr.created_at
ORDER BY cr.created_at DESC;

-- ============================================================================
-- 8. TEST CREATING A NEW DIRECT MESSAGE ROOM
-- ============================================================================

-- Test creating a new direct message room (replace with actual user ID)
-- SELECT public.create_direct_message_room('some-user-id-here'::uuid); 