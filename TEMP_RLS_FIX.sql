-- Temporary RLS Fix for Testing
-- Run this in your Supabase SQL Editor to allow all authenticated users to perform admin actions
-- WARNING: This is for testing only - remove these policies in production

-- Drop existing admin policies
DROP POLICY IF EXISTS "Admins can update any report" ON public.reports;
DROP POLICY IF EXISTS "Admins can delete any report" ON public.reports;

-- Create temporary policies that allow all authenticated users to update/delete reports
CREATE POLICY "Users can update any report"
    ON public.reports FOR UPDATE
    USING (true);

CREATE POLICY "Users can delete any report"
    ON public.reports FOR DELETE
    USING (true);

-- Verify the policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'reports'
ORDER BY policyname;
