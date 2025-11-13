-- Emergency fix for reports status constraint
-- This script directly fixes the check constraint on the reports table
-- Execute this in Supabase SQL editor to resolve the decline report error
-- The key is to FIX THE DATA FIRST before touching the constraint

-- Step 1: First, identify and fix any invalid status values
-- Any status not in this list will be set to 'pending'
UPDATE public.reports 
SET status = 'pending' 
WHERE status NOT IN ('pending', 'in_progress', 'resolved', 'declined', 'cancelled', 'verifying', 'awaiting_verification');

-- Step 2: Now drop the existing constraint
ALTER TABLE public.reports 
DROP CONSTRAINT IF EXISTS reports_status_check;

-- Step 3: Add the correct constraint with ALL valid statuses
ALTER TABLE public.reports 
ADD CONSTRAINT reports_status_check 
CHECK (status IN ('pending', 'in_progress', 'resolved', 'declined', 'cancelled', 'verifying', 'awaiting_verification'));

-- Step 4: Verify the constraint exists and is working
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'reports' 
AND constraint_name = 'reports_status_check';

-- Step 5: Show a count of reports by status to verify data integrity
SELECT status, COUNT(*) as count 
FROM public.reports 
GROUP BY status 
ORDER BY count DESC;
