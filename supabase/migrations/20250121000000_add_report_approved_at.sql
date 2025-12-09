-- Add approved_at column to reports table to track when a report is approved by admin
-- This tracks when a report moves from 'verifying' or 'awaiting_verification' to 'pending' or 'resolved'

DO $$ 
BEGIN
    -- Add approved_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'reports' 
        AND column_name = 'approved_at'
    ) THEN
        ALTER TABLE public.reports ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added approved_at column to reports table';
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN public.reports.approved_at IS 'Timestamp when the report was approved by an admin (moved from verifying/awaiting_verification to pending/resolved)';

