-- Fix foreign key relationship issue for chat_messages and profiles
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- 1. DIAGNOSE THE CURRENT SCHEMA
-- ============================================================================

-- Check current foreign key relationships
SELECT 
    'Foreign key relationships:' as info,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('chat_messages', 'profiles', 'chat_participants')
ORDER BY tc.table_name, kcu.column_name;

-- Check chat_messages table structure
SELECT 
    'chat_messages columns:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'chat_messages'
ORDER BY ordinal_position;

-- Check profiles table structure
SELECT 
    'profiles columns:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- ============================================================================
-- 2. OPTION 1: CREATE A DIRECT FOREIGN KEY (RECOMMENDED)
-- ============================================================================

-- Add a direct foreign key from chat_messages.sender_id to profiles.id
-- This will allow Supabase to automatically detect the relationship

-- First, check if the foreign key already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_chat_messages_sender_profiles'
        AND table_schema = 'public'
        AND table_name = 'chat_messages'
    ) THEN
        -- Add the foreign key constraint
        ALTER TABLE public.chat_messages 
        ADD CONSTRAINT fk_chat_messages_sender_profiles 
        FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added foreign key constraint from chat_messages.sender_id to profiles.id';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists';
    END IF;
END $$;

-- ============================================================================
-- 3. OPTION 2: CREATE A VIEW FOR THE RELATIONSHIP
-- ============================================================================

-- Create a view that explicitly defines the relationship
DROP VIEW IF EXISTS public.chat_messages_with_profiles;

CREATE VIEW public.chat_messages_with_profiles AS
SELECT 
    cm.*,
    p.username,
    p.avatar_url,
    p.role
FROM public.chat_messages cm
LEFT JOIN public.profiles p ON cm.sender_id = p.id;

-- Grant permissions on the view
GRANT SELECT ON public.chat_messages_with_profiles TO authenticated;

-- ============================================================================
-- 4. OPTION 3: MODIFY THE QUERY APPROACH
-- ============================================================================

-- Create a function that returns messages with profiles
CREATE OR REPLACE FUNCTION public.get_messages_with_profiles(room_uuid uuid)
RETURNS TABLE (
    id uuid,
    room_id uuid,
    sender_id uuid,
    content text,
    created_at timestamptz,
    updated_at timestamptz,
    username text,
    avatar_url text,
    role text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cm.id,
        cm.room_id,
        cm.sender_id,
        cm.content,
        cm.created_at,
        cm.updated_at,
        p.username,
        p.avatar_url,
        p.role
    FROM public.chat_messages cm
    LEFT JOIN public.profiles p ON cm.sender_id = p.id
    WHERE cm.room_id = room_uuid
    ORDER BY cm.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_messages_with_profiles(uuid) TO authenticated;

-- ============================================================================
-- 5. TEST THE FIXES
-- ============================================================================

-- Test the direct foreign key approach
SELECT 
    'Testing direct foreign key:' as test,
    COUNT(*) as message_count
FROM public.chat_messages cm
LEFT JOIN public.profiles p ON cm.sender_id = p.id
WHERE cm.room_id = '27035978-a1ea-4b17-9a0a-667a192731ac';

-- Test the view approach
SELECT 
    'Testing view approach:' as test,
    COUNT(*) as message_count
FROM public.chat_messages_with_profiles
WHERE room_id = '27035978-a1ea-4b17-9a0a-667a192731ac';

-- Test the function approach
SELECT 
    'Testing function approach:' as test,
    COUNT(*) as message_count
FROM public.get_messages_with_profiles('27035978-a1ea-4b17-9a0a-667a192731ac'::uuid);

-- ============================================================================
-- 6. VERIFY FOREIGN KEY RELATIONSHIPS
-- ============================================================================

-- Show updated foreign key relationships
SELECT 
    'Updated foreign key relationships:' as info,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('chat_messages', 'profiles', 'chat_participants')
ORDER BY tc.table_name, kcu.column_name; 