-- Fix reports status check constraint
-- Drop the existing constraint if it exists
ALTER TABLE public.reports 
DROP CONSTRAINT IF EXISTS reports_status_check;

-- Add the correct constraint with all valid status values
ALTER TABLE public.reports 
ADD CONSTRAINT reports_status_check 
CHECK (status IN ('pending', 'in_progress', 'resolved', 'rejected'));

-- Update any existing records that might have invalid status values
-- This ensures data consistency
UPDATE public.reports 
SET status = 'pending' 
WHERE status NOT IN ('pending', 'in_progress', 'resolved', 'rejected');

-- Create an index on status for better performance
CREATE INDEX IF NOT EXISTS idx_reports_status_performance ON public.reports(status);

-- Add a comment to document the valid status values
COMMENT ON COLUMN public.reports.status IS 'Valid values: pending, in_progress, resolved, rejected'; 