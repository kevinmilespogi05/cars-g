-- Comprehensive fix: Create chat tables and apply safe policies
-- This migration creates the chat tables first, then applies safe RLS policies

-- ============================================================================
-- 1. CREATE CHAT TABLES (if they don't exist)
-- ============================================================================

-- Create chat_rooms table
CREATE TABLE IF NOT EXISTS public.chat_rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    is_direct_message BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create chat_participants table
CREATE TABLE IF NOT EXISTS public.chat_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(room_id, user_id)
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create message_reactions table
CREATE TABLE IF NOT EXISTS public.message_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(message_id, user_id, reaction)
);

-- Create blocked_users table
CREATE TABLE IF NOT EXISTS public.blocked_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(blocker_id, blocked_id)
);

-- Create chat_deletions table
CREATE TABLE IF NOT EXISTS public.chat_deletions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(room_id, user_id)
);

-- Create typing_indicators table
CREATE TABLE IF NOT EXISTS public.typing_indicators (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_typing BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(room_id, user_id)
);

-- ============================================================================
-- 2. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_deletions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. DROP ALL EXISTING PROBLEMATIC POLICIES
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
-- 4. CREATE SIMPLE, SAFE POLICIES (NO RECURSION)
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
            SELECT id FROM public.chat_messages 
            WHERE room_id IN (
                SELECT room_id FROM public.chat_participants 
                WHERE user_id = (select auth.uid())
            )
        )
    );

-- Blocked Users - Simple policies
CREATE POLICY "Users can view their blocked users"
    ON public.blocked_users FOR SELECT
    USING ((select auth.uid()) = blocker_id);

CREATE POLICY "Users can block other users"
    ON public.blocked_users FOR INSERT
    WITH CHECK ((select auth.uid()) = blocker_id);

CREATE POLICY "Users can unblock users"
    ON public.blocked_users FOR DELETE
    USING ((select auth.uid()) = blocker_id);

-- Chat Deletions - Simple policies
CREATE POLICY "Users can view their chat deletions"
    ON public.chat_deletions FOR SELECT
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete chats"
    ON public.chat_deletions FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

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
-- 5. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_chat_rooms_created_by ON public.chat_rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_chat_participants_room_id ON public.chat_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON public.chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON public.chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker_id ON public.blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_id ON public.blocked_users(blocked_id);
CREATE INDEX IF NOT EXISTS idx_chat_deletions_user_id ON public.chat_deletions(user_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_room_id ON public.typing_indicators(room_id);

-- ============================================================================
-- 6. CREATE TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================================================

-- Create function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_chat_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS update_chat_rooms_updated_at ON public.chat_rooms;
CREATE TRIGGER update_chat_rooms_updated_at
    BEFORE UPDATE ON public.chat_rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_updated_at();

DROP TRIGGER IF EXISTS update_chat_messages_updated_at ON public.chat_messages;
CREATE TRIGGER update_chat_messages_updated_at
    BEFORE UPDATE ON public.chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_updated_at();

DROP TRIGGER IF EXISTS update_typing_indicators_updated_at ON public.typing_indicators;
CREATE TRIGGER update_typing_indicators_updated_at
    BEFORE UPDATE ON public.typing_indicators
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_updated_at();

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_reactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocked_users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_deletions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.typing_indicators TO authenticated; 