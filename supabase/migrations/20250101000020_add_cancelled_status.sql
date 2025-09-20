-- Add missing statuses to reports status constraint
-- This migration updates the reports_status_check constraint to include all statuses used in the application

-- Drop the existing constraint if it exists
ALTER TABLE public.reports 
DROP CONSTRAINT IF EXISTS reports_status_check;

-- Add the updated constraint with all valid status values
ALTER TABLE public.reports 
ADD CONSTRAINT reports_status_check 
CHECK (status IN ('pending', 'in_progress', 'resolved', 'rejected', 'cancelled', 'verifying', 'awaiting_verification'));

-- Update the comment to document the new valid status values
COMMENT ON COLUMN public.reports.status IS 'Valid values: pending, in_progress, resolved, rejected, cancelled, verifying, awaiting_verification';

-- Verify the constraint is working by checking existing data
DO $$
DECLARE
    invalid_statuses text[];
BEGIN
    -- Check if there are any statuses that don't match the new constraint
    SELECT array_agg(DISTINCT status)
    INTO invalid_statuses
    FROM public.reports
    WHERE status NOT IN ('pending', 'in_progress', 'resolved', 'rejected', 'cancelled', 'verifying', 'awaiting_verification');
    
    IF array_length(invalid_statuses, 1) > 0 THEN
        RAISE EXCEPTION 'Found invalid statuses that violate the new constraint: %', invalid_statuses;
    ELSE
        RAISE NOTICE 'Status constraint validation passed - all existing data conforms to new constraint';
    END IF;
END $$;
