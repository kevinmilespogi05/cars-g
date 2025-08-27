-- Allow 'verifying' status in reports.status check constraint
-- Run this in your Supabase SQL Editor

-- 1) Drop existing constraint if present
ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_status_check;

-- 2) Recreate the constraint including the new status 'verifying'
ALTER TABLE public.reports
  ADD CONSTRAINT reports_status_check
  CHECK (status IN ('verifying', 'pending', 'in_progress', 'resolved', 'rejected'));

-- 3) Verify
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'status';

-- Optional: See distinct statuses currently present
SELECT DISTINCT status FROM public.reports ORDER BY status;


