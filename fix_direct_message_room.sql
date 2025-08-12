-- Fix direct message room with missing participants
-- This script will help identify and fix the issue with room 27035978-a1ea-4b17-9a0a-667a192731ac

-- First, let's see what's in this room
SELECT 
    'Room Info' as info,
    cr.id,
    cr.name,
    cr.is_direct_message,
    cr.created_at
FROM public.chat_rooms cr
WHERE cr.id = '27035978-a1ea-4b17-9a0a-667a192731ac';

-- Check current participants
SELECT 
    'Current Participants' as info,
    cp.room_id,
    cp.user_id,
    p.username
FROM public.chat_participants cp
LEFT JOIN public.profiles p ON cp.user_id = p.id
WHERE cp.room_id = '27035978-a1ea-4b17-9a0a-667a192731ac';

-- Check if there are any messages in this room
SELECT 
    'Messages in Room' as info,
    COUNT(*) as message_count
FROM public.chat_messages
WHERE room_id = '27035978-a1ea-4b17-9a0a-667a192731ac';

-- Check if this room was created by the create_direct_message_room function
-- Look for any clues about the other user
SELECT 
    'Room Creation Log' as info,
    cr.name,
    cr.created_at,
    CASE 
        WHEN cr.name != 'Direct Message' THEN 'Room has a custom name: ' || cr.name
        ELSE 'Room has default name'
    END as name_info
FROM public.chat_rooms cr
WHERE cr.id = '27035978-a1ea-4b17-9a0a-667a192731ac';

-- Let's see all direct message rooms to understand the pattern
SELECT 
    'All Direct Message Rooms' as info,
    cr.id,
    cr.name,
    cr.created_at,
    COUNT(cp.user_id) as participant_count
FROM public.chat_rooms cr
LEFT JOIN public.chat_participants cp ON cr.id = cp.room_id
WHERE cr.is_direct_message = true
GROUP BY cr.id, cr.name, cr.created_at
ORDER BY cr.created_at DESC;

-- Check if there are any users that might be the missing participant
-- Look for users with usernames that might match the room name
SELECT 
    'Potential Missing Users' as info,
    p.id,
    p.username,
    p.created_at
FROM public.profiles p
WHERE p.username IS NOT NULL
ORDER BY p.created_at DESC
LIMIT 10;

-- If we need to manually add a participant, uncomment and modify the following:
-- (Replace 'USER_ID_HERE' with the actual user ID that should be in this room)

/*
-- Add the missing participant (replace USER_ID_HERE with actual user ID)
INSERT INTO public.chat_participants (room_id, user_id, joined_at)
VALUES ('27035978-a1ea-4b17-9a0a-667a192731ac', 'USER_ID_HERE', NOW())
ON CONFLICT (room_id, user_id) DO NOTHING;

-- Update the room name if needed
UPDATE public.chat_rooms 
SET name = (SELECT username FROM public.profiles WHERE id = 'USER_ID_HERE')
WHERE id = '27035978-a1ea-4b17-9a0a-667a192731ac';
*/

-- Alternative: If this room is broken, we can delete it and let it be recreated
-- (Only uncomment if you're sure this room should be deleted)

/*
-- Delete the broken room and its data
DELETE FROM public.chat_messages WHERE room_id = '27035978-a1ea-4b17-9a0a-667a192731ac';
DELETE FROM public.chat_participants WHERE room_id = '27035978-a1ea-4b17-9a0a-667a192731ac';
DELETE FROM public.chat_rooms WHERE id = '27035978-a1ea-4b17-9a0a-667a192731ac';
*/ 