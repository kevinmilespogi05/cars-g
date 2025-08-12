-- Add missing columns to user_stats table
-- These columns are referenced in the code but missing from the schema

ALTER TABLE public.user_stats 
ADD COLUMN IF NOT EXISTS total_reports INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS resolved_reports INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0 NOT NULL;

-- Update existing rows to set default values
UPDATE public.user_stats 
SET 
    total_reports = COALESCE(reports_submitted, 0),
    resolved_reports = COALESCE(reports_resolved, 0),
    current_streak = COALESCE(days_active, 0),
    longest_streak = COALESCE(days_active, 0)
WHERE total_reports IS NULL OR resolved_reports IS NULL OR current_streak IS NULL OR longest_streak IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.user_stats.total_reports IS 'Total number of reports submitted by the user';
COMMENT ON COLUMN public.user_stats.resolved_reports IS 'Total number of reports resolved by the user';
COMMENT ON COLUMN public.user_stats.current_streak IS 'Current consecutive days active streak';
COMMENT ON COLUMN public.user_stats.longest_streak IS 'Longest consecutive days active streak achieved'; 