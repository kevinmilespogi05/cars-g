-- Fix infinite recursion in chat_participants RLS policy - FINAL FIX
-- The issue is that the policy is self-referencing, causing infinite recursion

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view participants in their rooms" ON public.chat_participants;

-- Create a completely different approach that avoids self-referencing
-- Option 1: Use a function to check participation (safer approach)
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

-- Create the policy using the function
CREATE POLICY "Users can view participants in their rooms" ON public.chat_participants FOR SELECT
    USING (
        public.is_user_participant_in_room(room_id, (select auth.uid()))
    );

-- Also fix any other potentially problematic policies
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.chat_messages;
CREATE POLICY "Users can view messages in their rooms" ON public.chat_messages FOR SELECT
    USING (
        public.is_user_participant_in_room(room_id, (select auth.uid()))
    );

-- Ensure chat_rooms policy is also safe
DROP POLICY IF EXISTS "Users can view rooms they participate in" ON public.chat_rooms;
CREATE POLICY "Users can view rooms they participate in" ON public.chat_rooms FOR SELECT
    USING (
        public.is_user_participant_in_room(id, (select auth.uid()))
    ); 