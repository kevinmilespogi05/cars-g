-- Fix infinite recursion in chat_participants RLS policy (Robust Version)
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- 1. DIAGNOSE THE RECURSION ISSUE
-- ============================================================================

-- Check current policies that might be causing recursion
SELECT 
    'Current chat_participants policies:' as info,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'chat_participants'
ORDER BY policyname;

-- Check current chat_messages policies
SELECT 
    'Current chat_messages policies:' as info,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'chat_messages'
ORDER BY policyname;

-- Check current chat_rooms policies
SELECT 
    'Current chat_rooms policies:' as info,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'chat_rooms'
ORDER BY policyname;

-- ============================================================================
-- 2. DROP ALL EXISTING POLICIES (COMPREHENSIVE)
-- ============================================================================

-- Drop ALL chat_participants policies
DROP POLICY IF EXISTS "Users can view participants in their rooms" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can join rooms" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can leave rooms" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can view their own participations" ON public.chat_participants;

-- Drop ALL chat_messages policies
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can send messages in their rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert messages in their rooms" ON public.chat_messages;

-- Drop ALL chat_rooms policies
DROP POLICY IF EXISTS "Users can view rooms they participate in" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can create chat rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can update rooms they created" ON public.chat_rooms;

-- ============================================================================
-- 3. CREATE SIMPLE, NON-RECURSIVE POLICIES
-- ============================================================================

-- Chat Participants - Simple policies without recursion
CREATE POLICY "Users can view their own participations" ON public.chat_participants FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can join rooms" ON public.chat_participants FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave rooms" ON public.chat_participants FOR DELETE
    USING (auth.uid() = user_id);

-- Chat Messages - Simple policies using direct user check
CREATE POLICY "Users can view messages in their rooms" ON public.chat_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_participants 
            WHERE room_id = chat_messages.room_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can send messages in their rooms" ON public.chat_messages FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM public.chat_participants 
            WHERE room_id = chat_messages.room_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own messages" ON public.chat_messages FOR UPDATE
    USING (auth.uid() = sender_id)
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages" ON public.chat_messages FOR DELETE
    USING (auth.uid() = sender_id);

-- Chat Rooms - Simple policies
CREATE POLICY "Users can view rooms they participate in" ON public.chat_rooms FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_participants 
            WHERE room_id = chat_rooms.id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create chat rooms" ON public.chat_rooms FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update rooms they created" ON public.chat_rooms FOR UPDATE
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

-- ============================================================================
-- 4. ADD USER TO ROOM (if needed)
-- ============================================================================

-- Add the current user to the problematic room if they're not already a participant
DO $$
BEGIN
    IF auth.uid() IS NOT NULL THEN
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

-- Test if the user can now query chat_participants without recursion
DO $$
BEGIN
    IF auth.uid() IS NOT NULL THEN
        -- Test the exact query that was failing
        PERFORM COUNT(*) FROM public.chat_participants 
        WHERE user_id = auth.uid();
        
        RAISE NOTICE 'chat_participants query test completed successfully';
    ELSE
        RAISE NOTICE 'Skipping test - user not authenticated';
    END IF;
END $$;

-- ============================================================================
-- 6. VERIFY ALL POLICIES
-- ============================================================================

-- Show all new policies
SELECT 
    'All chat policies after fix:' as info,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('chat_messages', 'chat_participants', 'chat_rooms')
ORDER BY tablename, policyname;

-- ============================================================================
-- 7. MANUAL PARTICIPANT ADDITION (if SQL editor user is not authenticated)
-- ============================================================================

-- If you need to manually add a user, uncomment and modify this:
-- Replace 'YOUR_USER_ID_HERE' with the actual user ID

-- INSERT INTO public.chat_participants (room_id, user_id)
-- SELECT 
--     '27035978-a1ea-4b17-9a0a-667a192731ac'::uuid as room_id,
--     'YOUR_USER_ID_HERE'::uuid as user_id
-- WHERE NOT EXISTS (
--     SELECT 1 FROM public.chat_participants 
--     WHERE room_id = '27035978-a1ea-4b17-9a0a-667a192731ac'::uuid 
--     AND user_id = 'YOUR_USER_ID_HERE'::uuid
-- );

-- ============================================================================
-- 8. VERIFY RLS IS ENABLED
-- ============================================================================

-- Check if RLS is enabled on all chat tables
SELECT 
    'RLS Status:' as info,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('chat_messages', 'chat_participants', 'chat_rooms')
ORDER BY tablename; 