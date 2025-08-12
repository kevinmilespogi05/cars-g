-- Remove duplicate chat rooms
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- 1. IDENTIFY DUPLICATE CHAT ROOMS
-- ============================================================================

-- Find duplicate direct message rooms (same participants)
WITH room_participants AS (
    SELECT 
        cr.id as room_id,
        cr.name as room_name,
        cr.created_at,
        cr.is_direct_message,
        array_agg(cp.user_id ORDER BY cp.user_id) as participant_ids,
        array_agg(p.username ORDER BY p.username) as participant_usernames
    FROM public.chat_rooms cr
    JOIN public.chat_participants cp ON cr.id = cp.room_id
    LEFT JOIN public.profiles p ON cp.user_id = p.id
    WHERE cr.is_direct_message = true
    GROUP BY cr.id, cr.name, cr.created_at, cr.is_direct_message
),
duplicate_groups AS (
    SELECT 
        participant_ids,
        participant_usernames,
        array_agg(room_id ORDER BY created_at) as room_ids,
        array_agg(room_name ORDER BY created_at) as room_names,
        array_agg(created_at ORDER BY created_at) as created_dates,
        COUNT(*) as duplicate_count
    FROM room_participants
    GROUP BY participant_ids, participant_usernames
    HAVING COUNT(*) > 1
)
SELECT 
    'Duplicate direct message rooms:' as info,
    participant_usernames,
    room_ids,
    room_names,
    created_dates,
    duplicate_count
FROM duplicate_groups
ORDER BY duplicate_count DESC;

-- ============================================================================
-- 2. SHOW ALL DIRECT MESSAGE ROOMS FOR REFERENCE
-- ============================================================================

-- Show all direct message rooms and their participants
SELECT 
    'All direct message rooms:' as info,
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
-- 3. REMOVE DUPLICATE ROOMS (KEEP THE OLDEST ONE)
-- ============================================================================

-- Create a function to remove duplicate direct message rooms
CREATE OR REPLACE FUNCTION public.remove_duplicate_chat_rooms()
RETURNS TABLE(removed_room_id uuid, kept_room_id uuid, participants text[])
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    duplicate_record RECORD;
    room_to_keep uuid;
    room_to_remove uuid;
    participant_list text[];
BEGIN
    -- Loop through duplicate groups
    FOR duplicate_record IN
        WITH room_participants AS (
            SELECT 
                cr.id as room_id,
                cr.name as room_name,
                cr.created_at,
                array_agg(cp.user_id ORDER BY cp.user_id) as participant_ids,
                array_agg(p.username ORDER BY p.username) as participant_usernames
            FROM public.chat_rooms cr
            JOIN public.chat_participants cp ON cr.id = cp.room_id
            LEFT JOIN public.profiles p ON cp.user_id = p.id
            WHERE cr.is_direct_message = true
            GROUP BY cr.id, cr.name, cr.created_at
        ),
        duplicate_groups AS (
            SELECT 
                participant_ids,
                participant_usernames,
                array_agg(room_id ORDER BY created_at) as room_ids,
                COUNT(*) as duplicate_count
            FROM room_participants
            GROUP BY participant_ids, participant_usernames
            HAVING COUNT(*) > 1
        )
        SELECT * FROM duplicate_groups
    LOOP
        -- Keep the first (oldest) room, remove the rest
        room_to_keep := duplicate_record.room_ids[1];
        participant_list := duplicate_record.participant_usernames;
        
        -- Remove duplicate rooms (keep the first one)
        FOR i IN 2..array_length(duplicate_record.room_ids, 1) LOOP
            room_to_remove := duplicate_record.room_ids[i];
            
            -- Delete participants from the room to be removed
            DELETE FROM public.chat_participants WHERE room_id = room_to_remove;
            
            -- Delete messages from the room to be removed
            DELETE FROM public.chat_messages WHERE room_id = room_to_remove;
            
            -- Delete the room itself
            DELETE FROM public.chat_rooms WHERE id = room_to_remove;
            
            -- Return information about what was removed
            removed_room_id := room_to_remove;
            kept_room_id := room_to_keep;
            RETURN NEXT;
        END LOOP;
    END LOOP;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.remove_duplicate_chat_rooms() TO authenticated;

-- ============================================================================
-- 4. RUN THE DUPLICATE REMOVAL
-- ============================================================================

-- Execute the function to remove duplicates
SELECT 
    'Removing duplicates...' as action,
    removed_room_id,
    kept_room_id,
    participants
FROM public.remove_duplicate_chat_rooms();

-- ============================================================================
-- 5. VERIFY DUPLICATES ARE REMOVED
-- ============================================================================

-- Check if duplicates still exist
SELECT 
    'Remaining rooms after cleanup:' as info,
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
-- 6. CLEAN UP ORPHANED DATA
-- ============================================================================

-- Remove any orphaned participants (rooms that don't exist)
DELETE FROM public.chat_participants 
WHERE room_id NOT IN (SELECT id FROM public.chat_rooms);

-- Remove any orphaned messages (rooms that don't exist)
DELETE FROM public.chat_messages 
WHERE room_id NOT IN (SELECT id FROM public.chat_rooms);

-- ============================================================================
-- 7. FINAL VERIFICATION
-- ============================================================================

-- Final count of rooms
SELECT 
    'Final room count:' as info,
    COUNT(*) as total_rooms,
    COUNT(CASE WHEN is_direct_message THEN 1 END) as direct_message_rooms,
    COUNT(CASE WHEN NOT is_direct_message THEN 1 END) as group_rooms
FROM public.chat_rooms;

-- Check for any remaining duplicates
WITH room_participants AS (
    SELECT 
        cr.id as room_id,
        array_agg(cp.user_id ORDER BY cp.user_id) as participant_ids
    FROM public.chat_rooms cr
    JOIN public.chat_participants cp ON cr.id = cp.room_id
    WHERE cr.is_direct_message = true
    GROUP BY cr.id
),
duplicate_check AS (
    SELECT 
        participant_ids,
        COUNT(*) as room_count
    FROM room_participants
    GROUP BY participant_ids
    HAVING COUNT(*) > 1
)
SELECT 
    'Duplicate check:' as info,
    COUNT(*) as duplicate_groups_remaining
FROM duplicate_check; 