-- Fix infinite recursion in chat_participants RLS policy - REMOTE FIX
-- Run this script directly on the remote database

-- Drop all existing chat-related policies that might cause recursion
DROP POLICY IF EXISTS "Users can view participants in their rooms" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can join rooms" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can leave rooms" ON public.chat_participants;

DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can send messages in their rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.chat_messages;

DROP POLICY IF EXISTS "Users can view rooms they participate in" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can create chat rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can update rooms they created" ON public.chat_rooms;

-- Create a function to safely check participation (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_user_participant_in_room(room_uuid uuid, user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  -- This function bypasses RLS to check participation
  RETURN EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE room_id = room_uuid AND user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create safe policies using the function
CREATE POLICY "Users can view participants in their rooms" ON public.chat_participants FOR SELECT
    USING (public.is_user_participant_in_room(room_id, (select auth.uid())));

CREATE POLICY "Users can join rooms" ON public.chat_participants FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can leave rooms" ON public.chat_participants FOR DELETE
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view messages in their rooms" ON public.chat_messages FOR SELECT
    USING (public.is_user_participant_in_room(room_id, (select auth.uid())));

CREATE POLICY "Users can send messages in their rooms" ON public.chat_messages FOR INSERT
    WITH CHECK (
        (select auth.uid()) = sender_id AND
        public.is_user_participant_in_room(room_id, (select auth.uid()))
    );

CREATE POLICY "Users can update their own messages" ON public.chat_messages FOR UPDATE
    USING ((select auth.uid()) = sender_id)
    WITH CHECK ((select auth.uid()) = sender_id);

CREATE POLICY "Users can delete their own messages" ON public.chat_messages FOR DELETE
    USING ((select auth.uid()) = sender_id);

CREATE POLICY "Users can view rooms they participate in" ON public.chat_rooms FOR SELECT
    USING (public.is_user_participant_in_room(id, (select auth.uid())));

CREATE POLICY "Users can create chat rooms" ON public.chat_rooms FOR INSERT
    WITH CHECK ((select auth.uid()) = created_by);

CREATE POLICY "Users can update rooms they created" ON public.chat_rooms FOR UPDATE
    USING ((select auth.uid()) = created_by)
    WITH CHECK ((select auth.uid()) = created_by); 