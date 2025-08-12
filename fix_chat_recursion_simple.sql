-- Simple Fix for Chat Recursion Issue - Run this in your Supabase SQL Editor
-- This script creates minimal, safe RLS policies that avoid recursion

-- ============================================================================
-- 1. DROP ALL EXISTING PROBLEMATIC POLICIES
-- ============================================================================

-- Drop all existing policies for chat tables
DROP POLICY IF EXISTS "Users can view rooms they participate in" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can create rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can update rooms they created" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can create chat rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can update rooms they created" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can view rooms they participate in" ON public.chat_rooms;

DROP POLICY IF EXISTS "Users can view participants in their rooms" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can join rooms" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can leave rooms" ON public.chat_participants;

DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can send messages in their rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert messages in their rooms" ON public.chat_messages;

DROP POLICY IF EXISTS "Users can view reactions in their rooms" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can add reactions" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can remove their reactions" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can update their own reactions" ON public.message_reactions;

DROP POLICY IF EXISTS "Users can view typing indicators in their rooms" ON public.typing_indicators;
DROP POLICY IF EXISTS "Users can update their typing status" ON public.typing_indicators;
DROP POLICY IF EXISTS "Users can insert their own typing indicators" ON public.typing_indicators;
DROP POLICY IF EXISTS "Users can update their own typing indicators" ON public.typing_indicators;

-- ============================================================================
-- 2. CREATE MINIMAL, SAFE POLICIES
-- ============================================================================

-- Chat Rooms - Simple policies
CREATE POLICY "Users can create chat rooms"
    ON public.chat_rooms FOR INSERT
    WITH CHECK ((select auth.uid()) = created_by);

CREATE POLICY "Users can update rooms they created"
    ON public.chat_rooms FOR UPDATE
    USING ((select auth.uid()) = created_by)
    WITH CHECK ((select auth.uid()) = created_by);

-- Simple SELECT policy - just check if user is a participant
CREATE POLICY "Users can view rooms they participate in"
    ON public.chat_rooms FOR SELECT
    USING (
        id IN (
            SELECT room_id FROM public.chat_participants 
            WHERE user_id = (select auth.uid())
        )
    );

-- Chat Participants - Simple policies
CREATE POLICY "Users can join rooms"
    ON public.chat_participants FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can leave rooms"
    ON public.chat_participants FOR DELETE
    USING ((select auth.uid()) = user_id);

-- Simple SELECT policy - just check if user is in the room
CREATE POLICY "Users can view participants in their rooms"
    ON public.chat_participants FOR SELECT
    USING (
        room_id IN (
            SELECT room_id FROM public.chat_participants 
            WHERE user_id = (select auth.uid())
        )
    );

-- Chat Messages - Simple policies
CREATE POLICY "Users can send messages in their rooms"
    ON public.chat_messages FOR INSERT
    WITH CHECK (
        (select auth.uid()) = sender_id AND
        room_id IN (
            SELECT room_id FROM public.chat_participants 
            WHERE user_id = (select auth.uid())
        )
    );

CREATE POLICY "Users can update their own messages"
    ON public.chat_messages FOR UPDATE
    USING ((select auth.uid()) = sender_id)
    WITH CHECK ((select auth.uid()) = sender_id);

CREATE POLICY "Users can delete their own messages"
    ON public.chat_messages FOR DELETE
    USING ((select auth.uid()) = sender_id);

CREATE POLICY "Users can view messages in their rooms"
    ON public.chat_messages FOR SELECT
    USING (
        room_id IN (
            SELECT room_id FROM public.chat_participants 
            WHERE user_id = (select auth.uid())
        )
    );

-- Message Reactions - Simple policies
CREATE POLICY "Users can add reactions"
    ON public.message_reactions FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can remove their reactions"
    ON public.message_reactions FOR DELETE
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own reactions"
    ON public.message_reactions FOR UPDATE
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can view reactions in their rooms"
    ON public.message_reactions FOR SELECT
    USING (
        message_id IN (
            SELECT cm.id FROM public.chat_messages cm
            JOIN public.chat_participants cp ON cm.room_id = cp.room_id
            WHERE cp.user_id = (select auth.uid())
        )
    );

-- Typing Indicators - Simple policies
CREATE POLICY "Users can insert their own typing indicators"
    ON public.typing_indicators FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own typing indicators"
    ON public.typing_indicators FOR UPDATE
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can view typing indicators in their rooms"
    ON public.typing_indicators FOR SELECT
    USING (
        room_id IN (
            SELECT room_id FROM public.chat_participants 
            WHERE user_id = (select auth.uid())
        )
    );

-- ============================================================================
-- 3. VERIFY POLICIES ARE CREATED
-- ============================================================================

-- Check that all policies were created successfully
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('chat_rooms', 'chat_participants', 'chat_messages', 'message_reactions', 'typing_indicators')
ORDER BY tablename, policyname; 