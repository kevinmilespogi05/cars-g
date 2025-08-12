-- Debug room names issue
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- 1. CHECK CURRENT CHAT ROOMS AND THEIR NAMES
-- ============================================================================

-- Show all chat rooms with their current names
SELECT 
    'All chat rooms:' as info,
    cr.id as room_id,
    cr.name as room_name,
    cr.is_direct_message,
    cr.created_at,
    cr.created_by,
    array_agg(cp.user_id) as participant_ids,
    array_agg(p.username) as participant_usernames
FROM public.chat_rooms cr
JOIN public.chat_participants cp ON cr.id = cp.room_id
LEFT JOIN public.profiles p ON cp.user_id = p.id
GROUP BY cr.id, cr.name, cr.is_direct_message, cr.created_at, cr.created_by
ORDER BY cr.created_at DESC;

-- ============================================================================
-- 2. CHECK SPECIFIC ROOM THAT'S SHOWING "kevin"
-- ============================================================================

-- Find the room that's currently selected in the UI
-- (You'll need to replace this with the actual room ID from your browser)
SELECT 
    'Specific room details:' as info,
    cr.id as room_id,
    cr.name as room_name,
    cr.is_direct_message,
    cr.created_at,
    cr.created_by,
    array_agg(cp.user_id) as participant_ids,
    array_agg(p.username) as participant_usernames,
    array_agg(p.id) as profile_ids
FROM public.chat_rooms cr
JOIN public.chat_participants cp ON cr.id = cp.room_id
LEFT JOIN public.profiles p ON cp.user_id = p.id
WHERE cr.name = 'kevin' OR cr.name LIKE '%kevin%'
GROUP BY cr.id, cr.name, cr.is_direct_message, cr.created_at, cr.created_by;

-- ============================================================================
-- 3. CHECK MESSAGES IN THE ROOM
-- ============================================================================

-- Show messages in the room that's showing "kevin"
SELECT 
    'Messages in kevin room:' as info,
    cm.id as message_id,
    cm.content,
    cm.sender_id,
    cm.created_at,
    p.username as sender_username,
    cr.name as room_name
FROM public.chat_messages cm
JOIN public.chat_rooms cr ON cm.room_id = cr.id
LEFT JOIN public.profiles p ON cm.sender_id = p.id
WHERE cr.name = 'kevin' OR cr.name LIKE '%kevin%'
ORDER BY cm.created_at DESC;

-- ============================================================================
-- 4. CHECK WHO "admin" IS
-- ============================================================================

-- Find the user with username "admin"
SELECT 
    'Admin user details:' as info,
    p.id as user_id,
    p.username,
    p.email,
    p.created_at
FROM public.profiles p
WHERE p.username = 'admin' OR p.username LIKE '%admin%';

-- ============================================================================
-- 5. CHECK CURRENT USER'S ROOMS
-- ============================================================================

-- Show all rooms for the current user (replace with actual user ID)
-- You can get your user ID from the browser console or auth
SELECT 
    'Current user rooms:' as info,
    cr.id as room_id,
    cr.name as room_name,
    cr.is_direct_message,
    array_agg(cp.user_id) as participant_ids,
    array_agg(p.username) as participant_usernames
FROM public.chat_rooms cr
JOIN public.chat_participants cp ON cr.id = cp.room_id
LEFT JOIN public.profiles p ON cp.user_id = p.id
WHERE cp.user_id = auth.uid()  -- This will show rooms for the current user
GROUP BY cr.id, cr.name, cr.is_direct_message
ORDER BY cr.created_at DESC;

-- ============================================================================
-- 6. CHECK IF THERE ARE MULTIPLE ROOMS WITH SAME PARTICIPANTS
-- ============================================================================

-- Check for duplicate direct message rooms
WITH room_participants AS (
    SELECT 
        cr.id as room_id,
        cr.name as room_name,
        array_agg(cp.user_id ORDER BY cp.user_id) as participant_ids,
        array_agg(p.username ORDER BY p.username) as participant_usernames
    FROM public.chat_rooms cr
    JOIN public.chat_participants cp ON cr.id = cp.room_id
    LEFT JOIN public.profiles p ON cp.user_id = p.id
    WHERE cr.is_direct_message = true
    GROUP BY cr.id, cr.name
)
SELECT 
    'Duplicate check:' as info,
    participant_ids,
    participant_usernames,
    array_agg(room_id) as room_ids,
    array_agg(room_name) as room_names,
    COUNT(*) as duplicate_count
FROM room_participants
GROUP BY participant_ids, participant_usernames
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC; 