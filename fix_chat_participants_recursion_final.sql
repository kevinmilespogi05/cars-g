-- Final fix for chat_participants infinite recursion
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- 1. DROP ALL EXISTING PROBLEMATIC POLICIES
-- ============================================================================

-- Drop all chat_participants policies
DROP POLICY IF EXISTS "Users can view participants in their rooms" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can join rooms" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can leave rooms" ON public.chat_participants;

-- Drop all chat_messages policies
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can send messages in their rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.chat_messages;

-- Drop all chat_rooms policies
DROP POLICY IF EXISTS "Users can view rooms they participate in" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can create chat rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can update rooms they created" ON public.chat_rooms;

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
-- 4. GRANT EXECUTE PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.is_user_participant_in_room(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_room_ids(uuid) TO authenticated;

-- ============================================================================
-- 5. TEST THE FIX
-- ============================================================================

-- Test if the function works
SELECT 
    'Function test' as test,
    public.is_user_participant_in_room(
        (SELECT id FROM public.chat_rooms LIMIT 1), 
        (select auth.uid())
    ) as is_participant;

-- Test getting user's room IDs
SELECT 
    'Room IDs test' as test,
    public.get_user_room_ids((select auth.uid())) as room_ids;

-- Test if current user can view participants
SELECT 
    'Can view participants' as test,
    COUNT(*) as participant_count
FROM public.chat_participants cp
WHERE public.is_user_participant_in_room(cp.room_id, (select auth.uid()));

-- ============================================================================
-- 6. VERIFICATION
-- ============================================================================

-- Show all chat_participants policies
SELECT 
    policyname,
    cmd,
    'Policy exists' as status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'chat_participants'
ORDER BY policyname;

-- Show all functions
SELECT 
    routine_name,
    'Function exists' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('is_user_participant_in_room', 'get_user_room_ids')
ORDER BY routine_name; 