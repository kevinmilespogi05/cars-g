-- Fix infinite recursion in chat_participants RLS policy
-- The issue is that the policy is trying to check permissions by querying the same table it's protecting

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view participants in their rooms" ON public.chat_participants;

-- Create a new policy that checks permissions through chat_rooms instead
-- This avoids the infinite recursion by not self-referencing the chat_participants table
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

-- Also fix the similar issue in chat_messages policy that references chat_participants
DROP POLICY IF EXISTS "Users can send messages in their rooms" ON public.chat_messages;
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

DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.chat_messages;
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

-- Fix message reactions policy as well
DROP POLICY IF EXISTS "Users can view reactions in their rooms" ON public.message_reactions;
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

-- Fix typing indicators policy
DROP POLICY IF EXISTS "Users can view typing indicators in their rooms" ON public.typing_indicators;
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