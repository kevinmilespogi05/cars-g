-- Add archive system to reports table
-- This allows admins to archive reports instead of permanently deleting them

ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS archive_reason TEXT;

-- Create index for faster queries on archived reports
CREATE INDEX IF NOT EXISTS idx_reports_is_archived ON public.reports(is_archived);
CREATE INDEX IF NOT EXISTS idx_reports_archived_at ON public.reports(archived_at DESC);

-- Add comments for documentation
COMMENT ON COLUMN public.reports.is_archived IS 'Whether the report has been archived (true) or is active (false)';
COMMENT ON COLUMN public.reports.archived_at IS 'Timestamp when the report was archived';
COMMENT ON COLUMN public.reports.archived_by IS 'Admin user ID who archived the report';
COMMENT ON COLUMN public.reports.archive_reason IS 'Optional reason/note provided by admin when archiving';

