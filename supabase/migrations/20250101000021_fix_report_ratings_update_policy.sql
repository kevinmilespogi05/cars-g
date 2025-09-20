-- Fix report_ratings RLS policy to allow UPDATE operations for upsert functionality
-- The current policy only allows INSERT, but upsert operations need both INSERT and UPDATE

-- Add UPDATE policy for report_ratings
DO $$ 
BEGIN
  -- Check if the update policy already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'report_ratings' 
    AND policyname = 'report_ratings_update_owner'
  ) THEN
    -- Create UPDATE policy for owners to update their own ratings
    CREATE POLICY report_ratings_update_owner ON public.report_ratings 
    FOR UPDATE 
    USING (requester_user_id = auth.uid())
    WITH CHECK (requester_user_id = auth.uid());
  END IF;
END $$;
