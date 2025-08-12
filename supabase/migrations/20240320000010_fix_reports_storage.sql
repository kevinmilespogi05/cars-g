-- Drop existing policies
DROP POLICY IF EXISTS "Report images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload report images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own report images" ON storage.objects;

-- Drop policies that might already exist
DROP POLICY IF EXISTS "Reports public access" ON storage.objects;
DROP POLICY IF EXISTS "Reports authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Reports authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Reports authenticated deletes" ON storage.objects;

-- Recreate the reports bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create policy for public read access
CREATE POLICY "Reports public access"
ON storage.objects FOR SELECT
USING (bucket_id = 'reports');

-- Create policy for authenticated uploads
CREATE POLICY "Reports authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'reports');

-- Create policy for authenticated updates
CREATE POLICY "Reports authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'reports' AND auth.uid() = owner);

-- Create policy for authenticated deletes
CREATE POLICY "Reports authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'reports' AND auth.uid() = owner); 