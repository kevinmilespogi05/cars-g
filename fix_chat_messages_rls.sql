-- Fix chat_messages RLS policies to resolve 400 Bad Request errors
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- 1. DROP ALL EXISTING CHAT_MESSAGES POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can send messages in their rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert messages in their rooms" ON public.chat_messages;

-- ============================================================================
-- 2. CREATE SAFE CHAT_MESSAGES POLICIES (NO RECURSION)
-- ============================================================================

-- Policy for viewing messages - users can view messages in rooms they participate in
CREATE POLICY "Users can view messages in their rooms" ON public.chat_messages FOR SELECT
    USING (
        room_id IN (
            SELECT room_id FROM public.chat_participants 
            WHERE user_id = (select auth.uid())
        )
    );

-- Policy for sending messages - users can send messages in rooms they participate in
CREATE POLICY "Users can send messages in their rooms" ON public.chat_messages FOR INSERT
    WITH CHECK (
        (select auth.uid()) = sender_id AND
        room_id IN (
            SELECT room_id FROM public.chat_participants 
            WHERE user_id = (select auth.uid())
        )
    );

-- Policy for updating messages - users can only update their own messages
CREATE POLICY "Users can update their own messages" ON public.chat_messages FOR UPDATE
    USING ((select auth.uid()) = sender_id)
    WITH CHECK ((select auth.uid()) = sender_id);

-- Policy for deleting messages - users can only delete their own messages
CREATE POLICY "Users can delete their own messages" ON public.chat_messages FOR DELETE
    USING ((select auth.uid()) = sender_id);

-- ============================================================================
-- 3. VERIFY CHAT_MESSAGES TABLE STRUCTURE
-- ============================================================================

-- Check if chat_messages table has all required columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'chat_messages'
ORDER BY ordinal_position;

-- ============================================================================
-- 4. VERIFY CHAT_PARTICIPANTS TABLE STRUCTURE
-- ============================================================================

-- Check if chat_participants table has all required columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'chat_participants'
ORDER BY ordinal_position;

-- ============================================================================
-- 5. TEST THE POLICIES
-- ============================================================================

-- Test if a user can view messages (this will show the current user's permissions)
SELECT 
    'Current user can view messages' as test,
    COUNT(*) as message_count
FROM public.chat_messages cm
WHERE room_id IN (
    SELECT room_id FROM public.chat_participants 
    WHERE user_id = (select auth.uid())
);

-- ============================================================================
-- 6. VERIFY RLS IS ENABLED
-- ============================================================================

-- Check if RLS is enabled on chat_messages
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'chat_messages';

-- ============================================================================
-- 7. SHOW ALL CHAT_MESSAGES POLICIES
-- ============================================================================

-- List all policies on chat_messages table
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'chat_messages'
ORDER BY policyname; 