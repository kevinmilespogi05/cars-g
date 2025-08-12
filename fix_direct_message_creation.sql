-- Fix direct message room creation and naming
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- 1. DIAGNOSE CURRENT DIRECT MESSAGE ROOMS
-- ============================================================================

-- Check current direct message rooms and their participants
SELECT 
    'Current direct message rooms:' as info,
    cr.id as room_id,
    cr.name as room_name,
    cr.created_by,
    cr.is_direct_message,
    cr.created_at,
    array_agg(cp.user_id) as participant_ids,
    array_agg(p.username) as participant_usernames
FROM public.chat_rooms cr
JOIN public.chat_participants cp ON cr.id = cp.room_id
LEFT JOIN public.profiles p ON cp.user_id = p.id
WHERE cr.is_direct_message = true
GROUP BY cr.id, cr.name, cr.created_by, cr.is_direct_message, cr.created_at
ORDER BY cr.created_at DESC;

-- ============================================================================
-- 2. FIX EXISTING DIRECT MESSAGE ROOM NAMES
-- ============================================================================

-- Update all direct message rooms to show the other participant's username
UPDATE public.chat_rooms 
SET name = (
    SELECT p.username 
    FROM public.chat_participants cp
    JOIN public.profiles p ON cp.user_id = p.id
    WHERE cp.room_id = chat_rooms.id 
    AND cp.user_id != chat_rooms.created_by
    LIMIT 1
)
WHERE is_direct_message = true;

-- ============================================================================
-- 3. UPDATE THE CREATE DIRECT MESSAGE ROOM FUNCTION
-- ============================================================================

-- Drop and recreate the function to ensure it always sets the correct name
DROP FUNCTION IF EXISTS public.create_direct_message_room(UUID, TEXT);

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
    
    -- Always use the other user's username as the room name
    final_room_name := other_username;
    
    -- Create the direct message room with the other user's username
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
-- 4. CREATE A TRIGGER TO ENSURE ROOM NAMES ARE ALWAYS CORRECT
-- ============================================================================

-- Create a function to automatically update room names when participants change
CREATE OR REPLACE FUNCTION public.ensure_direct_message_room_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    room_record RECORD;
    other_username TEXT;
    current_user_id UUID;
BEGIN
    -- Get the current user ID
    current_user_id := auth.uid();
    
    -- Get the room details
    SELECT * INTO room_record
    FROM public.chat_rooms
    WHERE id = NEW.room_id;
    
    -- Only update if it's a direct message room
    IF room_record.is_direct_message THEN
        -- Get the other participant's username (not the room creator)
        SELECT p.username INTO other_username
        FROM public.chat_participants cp
        JOIN public.profiles p ON cp.user_id = p.id
        WHERE cp.room_id = NEW.room_id 
        AND cp.user_id != room_record.created_by
        LIMIT 1;
        
        -- Update the room name if we found a username and it's different
        IF other_username IS NOT NULL AND other_username != room_record.name THEN
            UPDATE public.chat_rooms 
            SET name = other_username
            WHERE id = NEW.room_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_ensure_direct_message_room_name ON public.chat_participants;
CREATE TRIGGER trigger_ensure_direct_message_room_name
    AFTER INSERT OR UPDATE ON public.chat_participants
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_direct_message_room_name();

-- ============================================================================
-- 5. CREATE A FUNCTION TO FIX ALL EXISTING ROOM NAMES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fix_all_direct_message_room_names()
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
        SELECT cr.id, cr.name, cr.created_by
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
        
        -- Update the room name if we found a username and it's different
        IF other_username IS NOT NULL AND other_username != room_record.name THEN
            UPDATE public.chat_rooms 
            SET name = other_username
            WHERE id = room_record.id;
            
            RAISE NOTICE 'Updated room % name from "%" to "%"', room_record.id, room_record.name, other_username;
        END IF;
    END LOOP;
END;
$$;

-- ============================================================================
-- 6. RUN THE FIX FUNCTION
-- ============================================================================

-- Run the function to fix all existing direct message room names
SELECT public.fix_all_direct_message_room_names();

-- ============================================================================
-- 7. VERIFY THE FIXES
-- ============================================================================

-- Check the updated direct message rooms
SELECT 
    'Updated direct message rooms:' as info,
    cr.id as room_id,
    cr.name as room_name,
    cr.created_by,
    cr.is_direct_message,
    cr.created_at,
    array_agg(cp.user_id) as participant_ids,
    array_agg(p.username) as participant_usernames
FROM public.chat_rooms cr
JOIN public.chat_participants cp ON cr.id = cp.room_id
LEFT JOIN public.profiles p ON cp.user_id = p.id
WHERE cr.is_direct_message = true
GROUP BY cr.id, cr.name, cr.created_by, cr.is_direct_message, cr.created_at
ORDER BY cr.created_at DESC; 