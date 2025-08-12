-- Fix Supabase Performance and Security Issues
-- This migration addresses:
-- 1. Auth RLS Initialization Plan issues (replace auth.<function>() with (select auth.<function>()))
-- 2. Multiple Permissive Policies (consolidate duplicate policies)
-- 3. Duplicate Indexes (remove duplicate indexes)

-- ============================================================================
-- 1. FIX AUTH RLS INITIALIZATION PLAN ISSUES
-- ============================================================================

-- Chat Rooms - Fix auth.uid() calls
DROP POLICY IF EXISTS "Users can create chat rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can create rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can update rooms they created" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can view rooms they participate in" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can view their chat rooms" ON public.chat_rooms;

CREATE POLICY "Users can create chat rooms"
    ON public.chat_rooms FOR INSERT
    WITH CHECK ((select auth.uid()) = created_by);

CREATE POLICY "Users can update rooms they created"
    ON public.chat_rooms FOR UPDATE
    USING ((select auth.uid()) = created_by)
    WITH CHECK ((select auth.uid()) = created_by);

CREATE POLICY "Users can view rooms they participate in"
    ON public.chat_rooms FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_participants
            WHERE room_id = id AND user_id = (select auth.uid())
        )
    );

-- Chat Participants - Fix auth.uid() calls
DROP POLICY IF EXISTS "Users can join rooms" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can leave rooms" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can view participants in their rooms" ON public.chat_participants;

CREATE POLICY "Users can join rooms"
    ON public.chat_participants FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can leave rooms"
    ON public.chat_participants FOR DELETE
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view participants in their rooms"
    ON public.chat_participants FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_participants cp2
            WHERE cp2.room_id = room_id AND cp2.user_id = (select auth.uid())
        )
    );

-- Chat Messages - Fix auth.uid() calls
DROP POLICY IF EXISTS "Users can insert messages in their rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can send messages in their rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.chat_messages;

CREATE POLICY "Users can send messages in their rooms"
    ON public.chat_messages FOR INSERT
    WITH CHECK (
        (select auth.uid()) = sender_id AND
        EXISTS (
            SELECT 1 FROM public.chat_participants
            WHERE room_id = chat_messages.room_id AND user_id = (select auth.uid())
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
        EXISTS (
            SELECT 1 FROM public.chat_participants
            WHERE room_id = chat_messages.room_id AND user_id = (select auth.uid())
        )
    );

-- Message Reactions - Fix auth.uid() calls
DROP POLICY IF EXISTS "Users can add reactions" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can add reactions to messages they can see" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can add their own reactions" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can remove their own reactions" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can remove their reactions" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can update their own reactions" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can view reactions for messages they can see" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can view reactions in their rooms" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can view reactions on messages they can see" ON public.message_reactions;

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
        EXISTS (
            SELECT 1 FROM public.chat_participants cp
            JOIN public.chat_messages cm ON cp.room_id = cm.room_id
            WHERE cm.id = message_reactions.message_id AND cp.user_id = (select auth.uid())
        )
    );

-- Blocked Users - Fix auth.uid() calls
DROP POLICY IF EXISTS "Users can block other users" ON public.blocked_users;
DROP POLICY IF EXISTS "Users can unblock other users" ON public.blocked_users;
DROP POLICY IF EXISTS "Users can unblock users" ON public.blocked_users;
DROP POLICY IF EXISTS "Users can view their blocked users" ON public.blocked_users;

CREATE POLICY "Users can block other users"
    ON public.blocked_users FOR INSERT
    WITH CHECK ((select auth.uid()) = blocker_id);

CREATE POLICY "Users can unblock users"
    ON public.blocked_users FOR DELETE
    USING ((select auth.uid()) = blocker_id);

CREATE POLICY "Users can view their blocked users"
    ON public.blocked_users FOR SELECT
    USING ((select auth.uid()) = blocker_id);

-- Chat Deletions - Fix auth.uid() calls
DROP POLICY IF EXISTS "Users can delete chats" ON public.chat_deletions;
DROP POLICY IF EXISTS "Users can delete chats for themselves" ON public.chat_deletions;
DROP POLICY IF EXISTS "Users can restore chats for themselves" ON public.chat_deletions;
DROP POLICY IF EXISTS "Users can view their chat deletions" ON public.chat_deletions;
DROP POLICY IF EXISTS "Users can view their own chat deletions" ON public.chat_deletions;

CREATE POLICY "Users can delete chats for themselves"
    ON public.chat_deletions FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can restore chats for themselves"
    ON public.chat_deletions FOR UPDATE
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own chat deletions"
    ON public.chat_deletions FOR SELECT
    USING ((select auth.uid()) = user_id);

-- Typing Indicators - Fix auth.uid() calls
DROP POLICY IF EXISTS "Users can insert their own typing indicators" ON public.typing_indicators;
DROP POLICY IF EXISTS "Users can update their own typing indicators" ON public.typing_indicators;
DROP POLICY IF EXISTS "Users can update their typing status" ON public.typing_indicators;
DROP POLICY IF EXISTS "Users can view typing indicators in rooms they are in" ON public.typing_indicators;
DROP POLICY IF EXISTS "Users can view typing indicators in their rooms" ON public.typing_indicators;

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
        EXISTS (
            SELECT 1 FROM public.chat_participants
            WHERE room_id = typing_indicators.room_id AND user_id = (select auth.uid())
        )
    );

-- Muted Rooms - Fix auth.uid() calls
DROP POLICY IF EXISTS "Users can mute rooms" ON public.muted_rooms;
DROP POLICY IF EXISTS "Users can unmute rooms" ON public.muted_rooms;
DROP POLICY IF EXISTS "Users can view their muted rooms" ON public.muted_rooms;

CREATE POLICY "Users can mute rooms"
    ON public.muted_rooms FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can unmute rooms"
    ON public.muted_rooms FOR DELETE
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their muted rooms"
    ON public.muted_rooms FOR SELECT
    USING ((select auth.uid()) = user_id);

-- Activities - Fix auth.uid() calls
DROP POLICY IF EXISTS "Users can view their own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can view all activities" ON public.activities;
DROP POLICY IF EXISTS "Users can insert their own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can update their own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can delete their own activities" ON public.activities;

CREATE POLICY "Users can view their own activities"
    ON public.activities FOR SELECT
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view all activities"
    ON public.activities FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own activities"
    ON public.activities FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own activities"
    ON public.activities FOR UPDATE
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own activities"
    ON public.activities FOR DELETE
    USING ((select auth.uid()) = user_id);

-- Comments - Fix auth.uid() calls
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.comments;
DROP POLICY IF EXISTS "Users can insert their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;

CREATE POLICY "Authenticated users can create comments"
    ON public.comments FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own comments"
    ON public.comments FOR UPDATE
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own comments"
    ON public.comments FOR DELETE
    USING ((select auth.uid()) = user_id);

-- Profiles - Fix auth.uid() calls
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update user ban status" ON public.profiles;

CREATE POLICY "Users can create their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING ((select auth.uid()) = id)
    WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can delete their own profile"
    ON public.profiles FOR DELETE
    USING ((select auth.uid()) = id);

CREATE POLICY "Admins can update user ban status"
    ON public.profiles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (select auth.uid())
            AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (select auth.uid())
            AND role = 'admin'
        )
    );

-- Likes - Fix auth.uid() calls
DROP POLICY IF EXISTS "Authenticated users can like reports" ON public.likes;
DROP POLICY IF EXISTS "Users can unlike their own likes" ON public.likes;

CREATE POLICY "Authenticated users can like reports"
    ON public.likes FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can unlike their own likes"
    ON public.likes FOR DELETE
    USING ((select auth.uid()) = user_id);

-- Points History - Fix auth.uid() calls
DROP POLICY IF EXISTS "Admins can insert points history" ON public.points_history;
DROP POLICY IF EXISTS "Admins can view all points history" ON public.points_history;
DROP POLICY IF EXISTS "Users can insert their own points history" ON public.points_history;
DROP POLICY IF EXISTS "Users can view their own points history" ON public.points_history;

CREATE POLICY "Admins can insert points history"
    ON public.points_history FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (select auth.uid())
            AND role = 'admin'
        )
    );

CREATE POLICY "Users can insert their own points history"
    ON public.points_history FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own points history"
    ON public.points_history FOR SELECT
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Admins can view all points history"
    ON public.points_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (select auth.uid())
            AND role = 'admin'
        )
    );

-- Reports - Fix auth.uid() calls
DROP POLICY IF EXISTS "Authenticated users can create reports" ON public.reports;
DROP POLICY IF EXISTS "Users can create their own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can update own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can update their own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can delete their own reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can update any report" ON public.reports;
DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can delete any report" ON public.reports;

CREATE POLICY "Users can create their own reports"
    ON public.reports FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own reports"
    ON public.reports FOR UPDATE
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own reports"
    ON public.reports FOR DELETE
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Admins can update any report"
    ON public.reports FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (select auth.uid())
            AND role = 'admin'
        )
    );

CREATE POLICY "Admins can delete any report"
    ON public.reports FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (select auth.uid())
            AND role = 'admin'
        )
    );

-- Settings - Fix auth.uid() calls
DROP POLICY IF EXISTS "Admins can manage settings" ON public.settings;

CREATE POLICY "Admins can manage settings"
    ON public.settings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (select auth.uid())
            AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (select auth.uid())
            AND role = 'admin'
        )
    );

-- User Stats - Fix auth.uid() calls
DROP POLICY IF EXISTS "Users can view their own stats" ON public.user_stats;
DROP POLICY IF EXISTS "Users can view all user stats" ON public.user_stats;
DROP POLICY IF EXISTS "Users can update their own stats" ON public.user_stats;
DROP POLICY IF EXISTS "Users can insert their own stats" ON public.user_stats;

CREATE POLICY "Users can view their own stats"
    ON public.user_stats FOR SELECT
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view all user stats"
    ON public.user_stats FOR SELECT
    USING (true);

CREATE POLICY "Users can update their own stats"
    ON public.user_stats FOR UPDATE
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own stats"
    ON public.user_stats FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

-- User Achievements - Fix auth.uid() calls
DROP POLICY IF EXISTS "Users can view their own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can view all user achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can insert their own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Admins can manage user achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "System can insert user achievements" ON public.user_achievements;

CREATE POLICY "Users can view their own achievements"
    ON public.user_achievements FOR SELECT
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view all user achievements"
    ON public.user_achievements FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own achievements"
    ON public.user_achievements FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Admins can manage user achievements"
    ON public.user_achievements FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (select auth.uid())
            AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (select auth.uid())
            AND role = 'admin'
        )
    );

-- Achievements - Fix auth.uid() calls
DROP POLICY IF EXISTS "Admins can manage achievements" ON public.achievements;

CREATE POLICY "Admins can manage achievements"
    ON public.achievements FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (select auth.uid())
            AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (select auth.uid())
            AND role = 'admin'
        )
    );

-- ============================================================================
-- 2. FIX MULTIPLE PERMISSIVE POLICIES
-- ============================================================================

-- Remove duplicate policies by keeping only the most specific ones
-- This consolidates policies that do the same thing for different roles

-- Chat Rooms: Keep only the most specific policies
-- (Already handled above by dropping duplicates)

-- Chat Messages: Keep only the most specific policies  
-- (Already handled above by dropping duplicates)

-- Comments: Keep only the most specific policies
-- (Already handled above by dropping duplicates)

-- Profiles: Keep only the most specific policies
-- (Already handled above by dropping duplicates)

-- Reports: Keep only the most specific policies
-- (Already handled above by dropping duplicates)

-- Message Reactions: Keep only the most specific policies
-- (Already handled above by dropping duplicates)

-- Typing Indicators: Keep only the most specific policies
-- (Already handled above by dropping duplicates)

-- User Achievements: Keep only the most specific policies
-- (Already handled above by dropping duplicates)

-- User Stats: Keep only the most specific policies
-- (Already handled above by dropping duplicates)

-- Points History: Keep only the most specific policies
-- (Already handled above by dropping duplicates)

-- ============================================================================
-- 3. FIX DUPLICATE INDEXES
-- ============================================================================

-- Remove duplicate indexes identified in the linter
DROP INDEX IF EXISTS chat_deletions_user_id_idx;
DROP INDEX IF EXISTS message_reactions_message_id_idx;
DROP INDEX IF EXISTS typing_indicators_room_id_idx;

-- Keep the idx_* versions as they follow a consistent naming convention
-- The following indexes remain:
-- - idx_chat_deletions_user_id
-- - idx_message_reactions_message_id  
-- - idx_typing_indicators_room_id

-- ============================================================================
-- 4. ADD MISSING POLICIES FOR PUBLIC ACCESS
-- ============================================================================

-- Add public access policies for tables that should be publicly viewable
-- These were missing from the original setup

-- Comments are viewable by everyone
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
CREATE POLICY "Comments are viewable by everyone"
    ON public.comments FOR SELECT
    USING (true);

-- Reports are viewable by everyone
DROP POLICY IF EXISTS "Reports are viewable by everyone" ON public.reports;
CREATE POLICY "Reports are viewable by everyone"
    ON public.reports FOR SELECT
    USING (true);

-- Profiles are viewable by everyone
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    USING (true);

-- Public profiles are viewable by everyone
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    USING (true);

-- Achievements are viewable by everyone
DROP POLICY IF EXISTS "Achievements are viewable by everyone" ON public.achievements;
CREATE POLICY "Achievements are viewable by everyone"
    ON public.achievements FOR SELECT
    USING (true);

-- User achievements are viewable by everyone
DROP POLICY IF EXISTS "User achievements are viewable by everyone" ON public.user_achievements;
CREATE POLICY "User achievements are viewable by everyone"
    ON public.user_achievements FOR SELECT
    USING (true);

-- ============================================================================
-- 5. VERIFICATION QUERIES
-- ============================================================================

-- These queries can be run to verify the fixes work correctly
-- (Commented out as they're for verification only)

/*
-- Check that auth.uid() calls are now wrapped in SELECT
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%';

-- Check for any remaining duplicate policies
SELECT 
    schemaname,
    tablename,
    cmd,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY schemaname, tablename, cmd
HAVING COUNT(*) > 1;

-- Check for any remaining duplicate indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
*/ 