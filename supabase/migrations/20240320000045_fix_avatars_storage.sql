-- Fix avatars storage bucket and policies
-- This migration ensures the avatars bucket exists with proper RLS policies

-- First, ensure the avatars bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars', 
    'avatars', 
    true, 
    5242880, -- 5MB file size limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Allow public access to avatars (for viewing profile pictures)
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow authenticated users to upload avatars
-- The path should be: avatars/{user_id}/{filename}
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own avatars
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Verify the bucket was created
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'avatars'
    ) THEN
        RAISE NOTICE 'Avatars bucket created/updated successfully';
    ELSE
        RAISE EXCEPTION 'Failed to create avatars bucket';
    END IF;
END $$;

-- Verify the policies were created with better error reporting
DO $$
DECLARE
    policy_count integer;
    policy_names text[];
    expected_policies text[] := ARRAY[
        'Avatar images are publicly accessible',
        'Users can upload their own avatar',
        'Users can update their own avatar',
        'Users can delete their own avatar'
    ];
    missing_policies text[];
BEGIN
    -- Get actual policies created
    SELECT array_agg(policyname ORDER BY policyname)
    INTO policy_names
    FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname LIKE '%avatar%';
    
    -- Count policies
    policy_count := array_length(policy_names, 1);
    
    -- Find missing policies
    SELECT array_agg(expected)
    INTO missing_policies
    FROM unnest(expected_policies) AS expected
    WHERE expected != ALL(policy_names);
    
    -- Report results
    RAISE NOTICE 'Avatar storage policies created: %', policy_count;
    RAISE NOTICE 'Created policies: %', policy_names;
    
    IF array_length(missing_policies, 1) > 0 THEN
        RAISE NOTICE 'Missing policies: %', missing_policies;
    END IF;
    
    IF policy_count >= 4 THEN
        RAISE NOTICE 'All avatar storage policies created successfully';
    ELSE
        RAISE WARNING 'Expected 4 avatar policies, but found %. Check the logs above for details.', policy_count;
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON TABLE storage.objects IS 'Storage objects including avatars, reports, and other user uploads'; 