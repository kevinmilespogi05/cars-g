-- Add user_notes_to_admin column to reports table
-- This field allows users to add private notes to admins during report creation
-- These notes are visible to admins but will be cleared when the report is accepted

ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS user_notes_to_admin TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.reports.user_notes_to_admin IS 'Private notes from the reporter to administrators. Visible only to admins and cleared when report is accepted.';

