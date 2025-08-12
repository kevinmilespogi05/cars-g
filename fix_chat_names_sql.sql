-- Fix direct message room names - Run this in Supabase SQL Editor
-- This script will update all direct message rooms to show the correct usernames

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
-- 3. VERIFY THE FIXES
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