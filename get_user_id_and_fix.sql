-- Simple script to get user ID and fix chat participant issue
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- 1. FIND YOUR USER ID
-- ============================================================================

-- First, let's see all users in the profiles table
SELECT 
    'Available users:' as info,
    id as user_id,
    username,
    email,
    created_at
FROM public.profiles
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- 2. CHECK CURRENT PARTICIPANTS IN THE ROOM
-- ============================================================================

-- Check who is currently a participant in the problematic room
SELECT 
    'Current participants in room:' as info,
    cp.user_id,
    p.username,
    p.email,
    cp.joined_at
FROM public.chat_participants cp
LEFT JOIN public.profiles p ON cp.user_id = p.id
WHERE cp.room_id = '27035978-a1ea-4b17-9a0a-667a192731ac'
ORDER BY cp.joined_at;

-- ============================================================================
-- 3. MANUAL PARTICIPANT ADDITION
-- ============================================================================

-- To add a user to the room, uncomment and modify one of these lines:
-- Replace 'USER_ID_HERE' with the actual user ID from step 1

-- Option 1: Add the most recent user (usually the current user)
-- INSERT INTO public.chat_participants (room_id, user_id)
-- SELECT 
--     '27035978-a1ea-4b17-9a0a-667a192731ac'::uuid as room_id,
--     (SELECT id FROM public.profiles ORDER BY created_at DESC LIMIT 1) as user_id
-- WHERE NOT EXISTS (
--     SELECT 1 FROM public.chat_participants 
--     WHERE room_id = '27035978-a1ea-4b17-9a0a-667a192731ac'::uuid 
--     AND user_id = (SELECT id FROM public.profiles ORDER BY created_at DESC LIMIT 1)
-- );

-- Option 2: Add a specific user by email (replace with your email)
-- INSERT INTO public.chat_participants (room_id, user_id)
-- SELECT 
--     '27035978-a1ea-4b17-9a0a-667a192731ac'::uuid as room_id,
--     (SELECT id FROM public.profiles WHERE email = 'your-email@example.com') as user_id
-- WHERE NOT EXISTS (
--     SELECT 1 FROM public.chat_participants 
--     WHERE room_id = '27035978-a1ea-4b17-9a0a-667a192731ac'::uuid 
--     AND user_id = (SELECT id FROM public.profiles WHERE email = 'your-email@example.com')
-- );

-- Option 3: Add a specific user by username (replace with your username)
-- INSERT INTO public.chat_participants (room_id, user_id)
-- SELECT 
--     '27035978-a1ea-4b17-9a0a-667a192731ac'::uuid as room_id,
--     (SELECT id FROM public.profiles WHERE username = 'your-username') as user_id
-- WHERE NOT EXISTS (
--     SELECT 1 FROM public.chat_participants 
--     WHERE room_id = '27035978-a1ea-4b17-9a0a-667a192731ac'::uuid 
--     AND user_id = (SELECT id FROM public.profiles WHERE username = 'your-username')
-- );

-- ============================================================================
-- 4. VERIFY THE FIX
-- ============================================================================

-- After adding the participant, verify they can access messages
-- (This will work if you're authenticated in your app, not in SQL editor)
SELECT 
    'Room messages (if accessible):' as info,
    COUNT(*) as message_count
FROM public.chat_messages 
WHERE room_id = '27035978-a1ea-4b17-9a0a-667a192731ac';

-- ============================================================================
-- 5. QUICK FIX FOR ALL USERS (if needed)
-- ============================================================================

-- If you want to add ALL users to this room (for testing), uncomment this:
-- INSERT INTO public.chat_participants (room_id, user_id)
-- SELECT 
--     '27035978-a1ea-4b17-9a0a-667a192731ac'::uuid as room_id,
--     p.id as user_id
-- FROM public.profiles p
-- WHERE NOT EXISTS (
--     SELECT 1 FROM public.chat_participants cp
--     WHERE cp.room_id = '27035978-a1ea-4b17-9a0a-667a192731ac'::uuid 
--     AND cp.user_id = p.id
-- ); 