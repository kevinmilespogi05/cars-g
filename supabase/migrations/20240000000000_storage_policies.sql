-- Create a function to set up storage policies for a bucket
CREATE OR REPLACE FUNCTION create_storage_policies(bucket_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create policy to allow authenticated users to upload
  EXECUTE format(
    'CREATE POLICY "Allow authenticated uploads" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = %L AND (storage.foldername(name))[1] = ''images'')',
    bucket_name
  );

  -- Create policy to allow public read access
  EXECUTE format(
    'CREATE POLICY "Allow public read access" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = %L)',
    bucket_name
  );

  -- Create policy to allow authenticated users to delete their own uploads
  EXECUTE format(
    'CREATE POLICY "Allow authenticated deletes" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = %L AND auth.uid() = owner::uuid)',
    bucket_name
  );
END;
$$; 