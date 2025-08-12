-- Final Fix for Chat Participants Infinite Recursion
-- This migration completely resolves the infinite recursion issue

-- ============================================================================
-- 1. DROP ALL EXISTING PROBLEMATIC POLICIES
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
DROP POLICY IF EXISTS "Users can create rooms" ON public.chat_rooms;

-- ============================================================================
-- 2. CREATE SECURITY DEFINER FUNCTIONS TO BYPASS RLS
-- ============================================================================

-- Function to check if user is participant in a room (bypasses RLS)
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

-- Function to get user's room IDs (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_room_ids(user_uuid uuid)
RETURNS uuid[] AS $$
BEGIN
  -- This function bypasses RLS to get room IDs
  RETURN ARRAY(
    SELECT room_id FROM public.chat_participants 
    WHERE user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get room participants (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_room_participants(room_uuid uuid)
RETURNS TABLE(user_id uuid) AS $$
BEGIN
  -- This function bypasses RLS to get room participants
  RETURN QUERY
  SELECT cp.user_id FROM public.chat_participants cp
  WHERE cp.room_id = room_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get direct message rooms with participants (optimized)
CREATE OR REPLACE FUNCTION public.get_direct_message_rooms_with_participants(user_uuid uuid)
RETURNS TABLE(
    room_id uuid,
    room_name text,
    created_by uuid,
    other_user_id uuid,
    other_username text
) AS $$
BEGIN
  -- This function bypasses RLS and gets all needed data efficiently
  RETURN QUERY
  SELECT 
    cr.id as room_id,
    cr.name as room_name,
    cr.created_by,
    cp.user_id as other_user_id,
    p.username as other_username
  FROM public.chat_rooms cr
  JOIN public.chat_participants cp ON cr.id = cp.room_id
  JOIN public.profiles p ON cp.user_id = p.id
  WHERE cr.is_direct_message = true
    AND cp.user_id != user_uuid
    AND EXISTS (
      SELECT 1 FROM public.chat_participants cp2
      WHERE cp2.room_id = cr.id AND cp2.user_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update direct message room names (optimized)
CREATE OR REPLACE FUNCTION public.update_direct_message_room_names(user_uuid uuid)
RETURNS void AS $$
DECLARE
    room_record RECORD;
BEGIN
  -- Loop through direct message rooms for this user
  FOR room_record IN 
    SELECT * FROM public.get_direct_message_rooms_with_participants(user_uuid)
  LOOP
    -- Update room name if different
    IF room_record.other_username IS NOT NULL AND room_record.other_username != room_record.room_name THEN
      UPDATE public.chat_rooms 
      SET name = room_record.other_username
      WHERE id = room_record.room_id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. CREATE SAFE POLICIES USING FUNCTIONS
-- ============================================================================

-- Chat Participants - Safe policies using functions
CREATE POLICY "Users can view participants in their rooms" ON public.chat_participants FOR SELECT
    USING (public.is_user_participant_in_room(room_id, (select auth.uid())));

CREATE POLICY "Users can join rooms" ON public.chat_participants FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can leave rooms" ON public.chat_participants FOR DELETE
    USING ((select auth.uid()) = user_id);

-- Chat Messages - Safe policies using functions
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

-- Chat Rooms - Safe policies using functions
CREATE POLICY "Users can view rooms they participate in" ON public.chat_rooms FOR SELECT
    USING (public.is_user_participant_in_room(id, (select auth.uid())));

CREATE POLICY "Users can create chat rooms" ON public.chat_rooms FOR INSERT
    WITH CHECK ((select auth.uid()) = created_by);

CREATE POLICY "Users can update rooms they created" ON public.chat_rooms FOR UPDATE
    USING ((select auth.uid()) = created_by)
    WITH CHECK ((select auth.uid()) = created_by);

-- ============================================================================
-- 4. GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions on all functions
GRANT EXECUTE ON FUNCTION public.is_user_participant_in_room(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_room_ids(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_room_participants(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_direct_message_rooms_with_participants(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_direct_message_room_names(uuid) TO authenticated;

-- ============================================================================
-- 5. VERIFY THE FIXES
-- ============================================================================

-- Check that all policies were created successfully
SELECT 
    'Verification - All policies created:' as info,
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('chat_participants', 'chat_messages', 'chat_rooms')
ORDER BY tablename, policyname; 