-- Migration: Add superadmin role support
-- Description: Updates RLS policies to include 'superadmin' role alongside 'admin' 
--              and seeds an initial superadmin profile

-- ============================================================================
-- PART 1: Update RLS Policies to include 'superadmin'
-- ============================================================================

-- Update settings table policies
-- Using ALTER POLICY for idempotency (won't fail if run multiple times)
BEGIN;

-- Try to alter existing policies if they exist, otherwise create them
DO $$ 
BEGIN
  -- Settings table policies
  ALTER POLICY "Admins can read settings" ON public.settings
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'superadmin')
        )
    );
EXCEPTION WHEN OTHERS THEN
  CREATE POLICY "Admins can read settings" ON public.settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'superadmin')
        )
    );
END $$;

DO $$ 
BEGIN
  ALTER POLICY "Admins can update settings" ON public.settings
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'superadmin')
        )
    );
EXCEPTION WHEN OTHERS THEN
  CREATE POLICY "Admins can update settings" ON public.settings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'superadmin')
        )
    );
END $$;

DO $$ 
BEGIN
  ALTER POLICY "Admins can insert settings" ON public.settings
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'superadmin')
        )
    );
EXCEPTION WHEN OTHERS THEN
  CREATE POLICY "Admins can insert settings" ON public.settings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'superadmin')
        )
    );
END $$;

DO $$ 
BEGIN
  ALTER POLICY "Admins can delete settings" ON public.settings
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'superadmin')
        )
    );
EXCEPTION WHEN OTHERS THEN
  CREATE POLICY "Admins can delete settings" ON public.settings
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'superadmin')
        )
    );
END $$;

-- Update announcements table policies
DO $$ 
BEGIN
  ALTER POLICY "Admins can manage announcements" ON public.announcements
    USING (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role IN ('admin', 'superadmin')
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role IN ('admin', 'superadmin')
        )
    );
EXCEPTION WHEN OTHERS THEN
  CREATE POLICY "Admins can manage announcements" ON public.announcements
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role IN ('admin', 'superadmin')
        )
    ) WITH CHECK (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role IN ('admin', 'superadmin')
        )
    );
END $$;

-- Update points_history table policies
DO $$ 
BEGIN
  ALTER POLICY "Admins can view all points history" ON public.points_history
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'superadmin')
        )
    );
EXCEPTION WHEN OTHERS THEN
  CREATE POLICY "Admins can view all points history" ON public.points_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'superadmin')
        )
    );
END $$;

-- Update reports table policies
DO $$ 
BEGIN
  ALTER POLICY "Admins can update any report" ON public.reports
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'superadmin')
        )
    );
EXCEPTION WHEN OTHERS THEN
  CREATE POLICY "Admins can update any report" ON public.reports
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'superadmin')
        )
    );
END $$;

DO $$ 
BEGIN
  ALTER POLICY "Admins can delete any report" ON public.reports
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'superadmin')
        )
    );
EXCEPTION WHEN OTHERS THEN
  CREATE POLICY "Admins can delete any report" ON public.reports
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'superadmin')
        )
    );
END $$;

-- Update profiles table policy
DO $$ 
BEGIN
  ALTER POLICY "Admins can update user ban status" ON public.profiles
    USING (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role IN ('admin', 'superadmin')
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role IN ('admin', 'superadmin')
        )
    );
EXCEPTION WHEN OTHERS THEN
  CREATE POLICY "Admins can update user ban status" ON public.profiles
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role IN ('admin', 'superadmin')
        )
    ) WITH CHECK (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role IN ('admin', 'superadmin')
        )
    );
END $$;

-- Update achievements table policies
DO $$ 
BEGIN
  ALTER POLICY "Admins can manage achievements" ON public.achievements
    USING (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role IN ('admin', 'superadmin')
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role IN ('admin', 'superadmin')
        )
    );
EXCEPTION WHEN OTHERS THEN
  CREATE POLICY "Admins can manage achievements" ON public.achievements
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role IN ('admin', 'superadmin')
        )
    ) WITH CHECK (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role IN ('admin', 'superadmin')
        )
    );
END $$;

-- Update user_achievements table policies
DO $$ 
BEGIN
  ALTER POLICY "Admins can manage user achievements" ON public.user_achievements
    USING (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role IN ('admin', 'superadmin')
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role IN ('admin', 'superadmin')
        )
    );
EXCEPTION WHEN OTHERS THEN
  CREATE POLICY "Admins can manage user achievements" ON public.user_achievements
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role IN ('admin', 'superadmin')
        )
    ) WITH CHECK (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role IN ('admin', 'superadmin')
        )
    );
END $$;

-- Update admin_chats table policies
DO $$ 
BEGIN
  ALTER POLICY "Users can read their admin chats" ON public.admin_chats
    USING (
        auth.uid() = user_id OR
        auth.uid() = admin_id OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
        )
    );
EXCEPTION WHEN OTHERS THEN
  CREATE POLICY "Users can read their admin chats" ON public.admin_chats
    FOR SELECT USING (
        auth.uid() = user_id OR
        auth.uid() = admin_id OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
        )
    );
END $$;

DO $$ 
BEGIN
  ALTER POLICY "Admins can update admin chats" ON public.admin_chats
    USING (
        auth.uid() = admin_id OR
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
        )
    );
EXCEPTION WHEN OTHERS THEN
  CREATE POLICY "Admins can update admin chats" ON public.admin_chats
    FOR UPDATE USING (
        auth.uid() = admin_id OR
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
        )
    );
END $$;

-- Update chat_rooms table policies
DO $$ 
BEGIN
  ALTER POLICY "Admins can update chat rooms" ON public.chat_rooms
    USING (
        auth.uid() = admin_id OR
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
        )
    );
EXCEPTION WHEN OTHERS THEN
  CREATE POLICY "Admins can update chat rooms" ON public.chat_rooms
    FOR UPDATE USING (
        auth.uid() = admin_id OR
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
        )
    );
END $$;

COMMIT;

-- ============================================================================
-- PART 2: Seed initial superadmin user
-- ============================================================================

-- Insert a default superadmin profile (you should update email/username as needed)
-- This assumes an auth user already exists with ID matching the one below
-- To use this, first create the auth user in Supabase Dashboard, then update the UUID here

-- Example: If no superadmin exists, you can manually insert one by running:
-- INSERT INTO public.profiles (
--   id, 
--   email, 
--   username, 
--   role, 
--   points, 
--   email_verified, 
--   created_at
-- ) VALUES (
--   '00000000-0000-0000-0000-000000000000',  -- Replace with actual auth user UUID
--   'superadmin@cars-g.local',
--   'superadmin',
--   'superadmin',
--   0,
--   true,
--   now()
-- ) ON CONFLICT (id) DO NOTHING;

-- Note: To create the superadmin, use the Node.js helper script or Supabase Dashboard
-- Do not hardcode a UUID here without ensuring an auth user exists first

-- ============================================================================
-- Migration completed: Superadmin role support added
-- All admin RLS policies now include 'superadmin' role
-- ============================================================================
