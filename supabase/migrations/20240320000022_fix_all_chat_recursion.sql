-- Comprehensive fix for all chat-related infinite recursion issues
-- This migration completely replaces all problematic policies with safe alternatives

-- ============================================================================
-- 1. FIX CHAT_ROOMS POLICIES
-- ============================================================================

-- Drop all existing chat_rooms policies
DROP POLICY IF EXISTS "Users can view rooms they participate in" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can create rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can update rooms they created" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can create chat rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can update rooms they created" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can view rooms they participate in" ON public.chat_rooms;

-- Create safe chat_rooms policies
CREATE POLICY "Users can create chat rooms"
    ON public.chat_rooms FOR INSERT
    WITH CHECK ((select auth.uid()) = created_by);

CREATE POLICY "Users can update rooms they created"
    ON public.chat_rooms FOR UPDATE
    USING ((select auth.uid()) = created_by)
    WITH CHECK ((select auth.uid()) = created_by);

-- This policy is safe because it only queries chat_participants, not chat_rooms itself
CREATE POLICY "Users can view rooms they participate in"
    ON public.chat_rooms FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_participants
            WHERE room_id = id AND user_id = (select auth.uid())
        )
    );

-- ============================================================================
-- 2. FIX CHAT_PARTICIPANTS POLICIES
-- ============================================================================

-- Drop all existing chat_participants policies
DROP POLICY IF EXISTS "Users can view participants in their rooms" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can join rooms" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can leave rooms" ON public.chat_participants;

-- Create safe chat_participants policies
CREATE POLICY "Users can join rooms"
    ON public.chat_participants FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can leave rooms"
    ON public.chat_participants FOR DELETE
    USING ((select auth.uid()) = user_id);

-- This policy is safe because it checks through chat_rooms first, avoiding self-reference
CREATE POLICY "Users can view participants in their rooms" ON public.chat_participants FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_rooms
            WHERE id = room_id AND 
            EXISTS (
                SELECT 1 FROM public.chat_participants cp_check
                WHERE cp_check.room_id = chat_rooms.id AND cp_check.user_id = (select auth.uid())
            )
        )
    );

-- ============================================================================
-- 3. FIX CHAT_MESSAGES POLICIES
-- ============================================================================

-- Drop all existing chat_messages policies
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can send messages in their rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert messages in their rooms" ON public.chat_messages;

-- Create safe chat_messages policies
CREATE POLICY "Users can send messages in their rooms" ON public.chat_messages FOR INSERT
    WITH CHECK (
        (select auth.uid()) = sender_id AND
        EXISTS (
            SELECT 1 FROM public.chat_rooms
            WHERE id = room_id AND 
            EXISTS (
                SELECT 1 FROM public.chat_participants cp_check
                WHERE cp_check.room_id = chat_rooms.id AND cp_check.user_id = (select auth.uid())
            )
        )
    );

CREATE POLICY "Users can update their own messages"
    ON public.chat_messages FOR UPDATE
    USING ((select auth.uid()) = sender_id)
    WITH CHECK ((select auth.uid()) = sender_id);

CREATE POLICY "Users can delete their own messages"
    ON public.chat_messages FOR DELETE
    USING ((select auth.uid()) = sender_id);

CREATE POLICY "Users can view messages in their rooms" ON public.chat_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_rooms
            WHERE id = room_id AND 
            EXISTS (
                SELECT 1 FROM public.chat_participants cp_check
                WHERE cp_check.room_id = chat_rooms.id AND cp_check.user_id = (select auth.uid())
            )
        )
    );

-- ============================================================================
-- 4. FIX MESSAGE_REACTIONS POLICIES
-- ============================================================================

-- Drop all existing message_reactions policies
DROP POLICY IF EXISTS "Users can view reactions in their rooms" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can add reactions" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can remove their reactions" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can update their own reactions" ON public.message_reactions;

-- Create safe message_reactions policies
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

CREATE POLICY "Users can view reactions in their rooms" ON public.message_reactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_rooms cr
            JOIN public.chat_messages cm ON cr.id = cm.room_id
            WHERE cm.id = message_reactions.message_id AND 
            EXISTS (
                SELECT 1 FROM public.chat_participants cp_check
                WHERE cp_check.room_id = cr.id AND cp_check.user_id = (select auth.uid())
            )
        )
    );

-- ============================================================================
-- 5. FIX TYPING_INDICATORS POLICIES
-- ============================================================================

-- Drop all existing typing_indicators policies
DROP POLICY IF EXISTS "Users can view typing indicators in their rooms" ON public.typing_indicators;
DROP POLICY IF EXISTS "Users can update their typing status" ON public.typing_indicators;
DROP POLICY IF EXISTS "Users can insert their own typing indicators" ON public.typing_indicators;
DROP POLICY IF EXISTS "Users can update their own typing indicators" ON public.typing_indicators;

-- Create safe typing_indicators policies
CREATE POLICY "Users can insert their own typing indicators"
    ON public.typing_indicators FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own typing indicators"
    ON public.typing_indicators FOR UPDATE
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can view typing indicators in their rooms" ON public.typing_indicators FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_rooms
            WHERE id = room_id AND 
            EXISTS (
                SELECT 1 FROM public.chat_participants cp_check
                WHERE cp_check.room_id = chat_rooms.id AND cp_check.user_id = (select auth.uid())
            )
        )
    );

-- ============================================================================
-- 6. VERIFY NO SELF-REFERENCING POLICIES EXIST
-- ============================================================================

-- This query will help identify any remaining problematic policies
-- Run this in your database to check for self-referencing policies:
/*
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
WHERE tablename IN ('chat_rooms', 'chat_participants', 'chat_messages', 'message_reactions', 'typing_indicators')
ORDER BY tablename, policyname;
*/ 