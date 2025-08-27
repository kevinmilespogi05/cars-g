-- Update the reports status constraint to include 'awaiting_verification'
ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_status_check;

ALTER TABLE public.reports
  ADD CONSTRAINT reports_status_check
  CHECK (status IN ('verifying', 'pending', 'in_progress', 'awaiting_verification', 'resolved', 'rejected'));
