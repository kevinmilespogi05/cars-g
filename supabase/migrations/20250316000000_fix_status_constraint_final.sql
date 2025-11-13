-- Fix reports status check constraint - With data cleanup
-- This migration ensures the constraint is correctly set for all valid statuses
-- and handles existing data that might violate it

-- Step 1: First, update any invalid status values BEFORE we drop and recreate the constraint
-- This prevents the error about constraint violation
UPDATE public.reports 
SET status = 'pending' 
WHERE status NOT IN ('pending', 'in_progress', 'resolved', 'declined', 'cancelled', 'verifying', 'awaiting_verification');

-- Step 2: Now drop the existing constraint
ALTER TABLE public.reports 
DROP CONSTRAINT IF EXISTS reports_status_check;

-- Step 3: Add the correct constraint with ALL valid status values
ALTER TABLE public.reports 
ADD CONSTRAINT reports_status_check 
CHECK (status IN ('pending', 'in_progress', 'resolved', 'declined', 'cancelled', 'verifying', 'awaiting_verification'));

-- Step 4: Update the column comment to reflect all valid values
COMMENT ON COLUMN public.reports.status IS 'Valid values: pending, in_progress, resolved, declined, cancelled, verifying, awaiting_verification';
