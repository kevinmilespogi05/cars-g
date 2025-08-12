-- Fix 400 Bad Request error for chat messages
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- 1. DIAGNOSE THE ISSUE
-- ============================================================================

-- Check if the room exists
SELECT 
    'Room exists' as check,
    COUNT(*) as count
FROM public.chat_rooms 
WHERE id = '27035978-a1ea-4b17-9a0a-667a192731ac';

-- Check if current user is participant in this room
SELECT 
    'User is participant' as check,
    COUNT(*) as count
FROM public.chat_participants 
WHERE room_id = '27035978-a1ea-4b17-9a0a-667a192731ac' 
AND user_id = (select auth.uid());

-- Check if there are any messages in this room
SELECT 
    'Messages exist' as check,
    COUNT(*) as count
FROM public.chat_messages 
WHERE room_id = '27035978-a1ea-4b17-9a0a-667a192731ac';

-- ============================================================================
-- 2. TEMPORARILY DISABLE RLS FOR TESTING
-- ============================================================================

-- Temporarily disable RLS on chat_messages to test if that's the issue
ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;

-- Test the query without RLS
SELECT 
    'Test without RLS' as test,
    COUNT(*) as message_count
FROM public.chat_messages cm
LEFT JOIN public.profiles p ON cm.sender_id = p.id
WHERE cm.room_id = '27035978-a1ea-4b17-9a0a-667a192731ac';

-- ============================================================================
-- 3. RE-ENABLE RLS AND CREATE SIMPLER POLICIES
-- ============================================================================

-- Re-enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can send messages in their rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.chat_messages;

-- Create a very simple policy that allows all authenticated users to view messages
-- This is for testing purposes - we'll make it more restrictive later
CREATE POLICY "Allow all authenticated users to view messages" ON public.chat_messages FOR SELECT
    USING (auth.role() = 'authenticated');

-- Create simple policies for other operations
CREATE POLICY "Users can send messages" ON public.chat_messages FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own messages" ON public.chat_messages FOR UPDATE
    USING (auth.uid() = sender_id)
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages" ON public.chat_messages FOR DELETE
    USING (auth.uid() = sender_id);

-- ============================================================================
-- 4. TEST THE SIMPLE POLICY
-- ============================================================================

-- Test if we can now view messages
SELECT 
    'Test with simple policy' as test,
    COUNT(*) as message_count
FROM public.chat_messages cm
LEFT JOIN public.profiles p ON cm.sender_id = p.id
WHERE cm.room_id = '27035978-a1ea-4b17-9a0a-667a192731ac';

-- ============================================================================
-- 5. IF SIMPLE POLICY WORKS, CREATE BETTER POLICY
-- ============================================================================

-- If the simple policy works, replace it with a more secure one
DROP POLICY IF EXISTS "Allow all authenticated users to view messages" ON public.chat_messages;

-- Create a more secure policy using the function approach
CREATE POLICY "Users can view messages in their rooms" ON public.chat_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_participants cp
            WHERE cp.room_id = chat_messages.room_id 
            AND cp.user_id = auth.uid()
        )
    );

-- ============================================================================
-- 6. TEST THE SECURE POLICY
-- ============================================================================

-- Test the secure policy
SELECT 
    'Test with secure policy' as test,
    COUNT(*) as message_count
FROM public.chat_messages cm
LEFT JOIN public.profiles p ON cm.sender_id = p.id
WHERE cm.room_id = '27035978-a1ea-4b17-9a0a-667a192731ac';

-- ============================================================================
-- 7. VERIFY PROFILES TABLE ACCESS
-- ============================================================================

-- Check if profiles table has proper policies
SELECT 
    policyname,
    cmd,
    'Profile policy exists' as status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles'
ORDER BY policyname;

-- Test if we can access profiles
SELECT 
    'Can access profiles' as test,
    COUNT(*) as profile_count
FROM public.profiles 
WHERE id IN (
    SELECT DISTINCT sender_id 
    FROM public.chat_messages 
    WHERE room_id = '27035978-a1ea-4b17-9a0a-667a192731ac'
);

-- ============================================================================
-- 8. FINAL VERIFICATION
-- ============================================================================

-- Show all chat_messages policies
SELECT 
    policyname,
    cmd,
    'Policy exists' as status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'chat_messages'
ORDER BY policyname;

-- Test the exact query that was failing
SELECT 
    cm.*,
    p.username,
    p.avatar_url
FROM public.chat_messages cm
LEFT JOIN public.profiles p ON cm.sender_id = p.id
WHERE cm.room_id = '27035978-a1ea-4b17-9a0a-667a192731ac'
ORDER BY cm.created_at ASC
LIMIT 5; 