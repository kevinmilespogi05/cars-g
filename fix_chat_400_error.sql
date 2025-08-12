-- Fix 400 Bad Request error for chat_messages query
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- 1. DIAGNOSE THE ISSUE
-- ============================================================================

-- Check if the user is authenticated
SELECT 
    'Current user ID:' as info,
    auth.uid() as user_id,
    CASE 
        WHEN auth.uid() IS NULL THEN 'User not authenticated'
        ELSE 'User authenticated'
    END as auth_status;

-- If user is not authenticated, we need to handle this differently
DO $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE NOTICE 'WARNING: User is not authenticated. Some operations may fail.';
        RAISE NOTICE 'Please ensure you are logged in before running this script.';
    END IF;
END $$;

-- Check if the specific room exists
SELECT 
    'Room exists:' as info,
    EXISTS (
        SELECT 1 FROM public.chat_rooms 
        WHERE id = '27035978-a1ea-4b17-9a0a-667a192731ac'
    ) as room_exists;

-- Check if the current user is a participant in this room (only if authenticated)
SELECT 
    'User is participant:' as info,
    CASE 
        WHEN auth.uid() IS NULL THEN 'Cannot check - user not authenticated'
        ELSE EXISTS (
            SELECT 1 FROM public.chat_participants 
            WHERE room_id = '27035978-a1ea-4b17-9a0a-667a192731ac' 
            AND user_id = auth.uid()
        )::text
    END as is_participant;

-- Check if there are any messages in this room
SELECT 
    'Messages in room:' as info,
    COUNT(*) as message_count
FROM public.chat_messages 
WHERE room_id = '27035978-a1ea-4b17-9a0a-667a192731ac';

-- ============================================================================
-- 2. DROP ALL EXISTING CHAT POLICIES
-- ============================================================================

-- Drop all chat_messages policies
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can send messages in their rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert messages in their rooms" ON public.chat_messages;

-- Drop all chat_participants policies
DROP POLICY IF EXISTS "Users can view participants in their rooms" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can join rooms" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can leave rooms" ON public.chat_participants;

-- Drop all chat_rooms policies
DROP POLICY IF EXISTS "Users can view rooms they participate in" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can create chat rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can update rooms they created" ON public.chat_rooms;

-- ============================================================================
-- 3. CREATE SIMPLE, SAFE POLICIES
-- ============================================================================

-- Chat Messages - Simple policies that work
CREATE POLICY "Users can view messages in their rooms" ON public.chat_messages FOR SELECT
    USING (
        room_id IN (
            SELECT room_id FROM public.chat_participants 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can send messages in their rooms" ON public.chat_messages FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id AND
        room_id IN (
            SELECT room_id FROM public.chat_participants 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own messages" ON public.chat_messages FOR UPDATE
    USING (auth.uid() = sender_id)
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages" ON public.chat_messages FOR DELETE
    USING (auth.uid() = sender_id);

-- Chat Participants - Simple policies
CREATE POLICY "Users can view participants in their rooms" ON public.chat_participants FOR SELECT
    USING (
        room_id IN (
            SELECT room_id FROM public.chat_participants 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can join rooms" ON public.chat_participants FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave rooms" ON public.chat_participants FOR DELETE
    USING (auth.uid() = user_id);

-- Chat Rooms - Simple policies
CREATE POLICY "Users can view rooms they participate in" ON public.chat_rooms FOR SELECT
    USING (
        id IN (
            SELECT room_id FROM public.chat_participants 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create chat rooms" ON public.chat_rooms FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update rooms they created" ON public.chat_rooms FOR UPDATE
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

-- ============================================================================
-- 4. ADD USER TO ROOM IF NOT ALREADY A PARTICIPANT (ONLY IF AUTHENTICATED)
-- ============================================================================

-- Only add user if they are authenticated
DO $$
BEGIN
    IF auth.uid() IS NOT NULL THEN
        -- Add the current user to the room if they're not already a participant
        INSERT INTO public.chat_participants (room_id, user_id)
        SELECT 
            '27035978-a1ea-4b17-9a0a-667a192731ac'::uuid as room_id,
            auth.uid() as user_id
        WHERE NOT EXISTS (
            SELECT 1 FROM public.chat_participants 
            WHERE room_id = '27035978-a1ea-4b17-9a0a-667a192731ac'::uuid 
            AND user_id = auth.uid()
        );
        
        RAISE NOTICE 'User participant check completed for user: %', auth.uid();
    ELSE
        RAISE NOTICE 'Skipping participant addition - user not authenticated';
    END IF;
END $$;

-- ============================================================================
-- 5. TEST THE FIX
-- ============================================================================

-- Test if the user can now view messages in the room (only if authenticated)
SELECT 
    'Test query result:' as info,
    CASE 
        WHEN auth.uid() IS NULL THEN 'Cannot test - user not authenticated'
        ELSE COUNT(*)::text
    END as message_count
FROM public.chat_messages 
WHERE room_id = '27035978-a1ea-4b17-9a0a-667a192731ac';

-- Test the exact query that was failing (only if authenticated)
DO $$
BEGIN
    IF auth.uid() IS NOT NULL THEN
        -- This will be executed only if user is authenticated
        PERFORM 
            cm.*,
            p.username,
            p.avatar_url
        FROM public.chat_messages cm
        LEFT JOIN public.profiles p ON cm.sender_id = p.id
        WHERE cm.room_id = '27035978-a1ea-4b17-9a0a-667a192731ac'
        ORDER BY cm.created_at ASC
        LIMIT 1;
        
        RAISE NOTICE 'Test query executed successfully for authenticated user';
    ELSE
        RAISE NOTICE 'Skipping test query - user not authenticated';
    END IF;
END $$;

-- ============================================================================
-- 6. VERIFY RLS IS ENABLED
-- ============================================================================

-- Check if RLS is enabled on all chat tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('chat_messages', 'chat_participants', 'chat_rooms')
ORDER BY tablename;

-- ============================================================================
-- 7. SHOW CURRENT POLICIES
-- ============================================================================

-- Show all policies for chat tables
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('chat_messages', 'chat_participants', 'chat_rooms')
ORDER BY tablename, policyname;

-- ============================================================================
-- 8. MANUAL PARTICIPANT ADDITION (if needed)
-- ============================================================================

-- If the user is not authenticated in the SQL editor, you can manually add them
-- Replace 'YOUR_USER_ID_HERE' with the actual user ID from your application
-- Uncomment and modify the line below:

-- INSERT INTO public.chat_participants (room_id, user_id)
-- SELECT 
--     '27035978-a1ea-4b17-9a0a-667a192731ac'::uuid as room_id,
--     'YOUR_USER_ID_HERE'::uuid as user_id
-- WHERE NOT EXISTS (
--     SELECT 1 FROM public.chat_participants 
--     WHERE room_id = '27035978-a1ea-4b17-9a0a-667a192731ac'::uuid 
--     AND user_id = 'YOUR_USER_ID_HERE'::uuid
-- ); 