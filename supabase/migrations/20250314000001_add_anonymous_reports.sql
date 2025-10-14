-- Add anonymous reporting feature
-- This allows users to submit reports without revealing their identity publicly
-- The user_id is still tracked for moderation purposes, but hidden from public view

-- Add is_anonymous column to reports table
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT FALSE NOT NULL;

-- Add index for filtering anonymous reports
CREATE INDEX IF NOT EXISTS idx_reports_is_anonymous ON public.reports(is_anonymous);

-- Add comment for documentation
COMMENT ON COLUMN public.reports.is_anonymous IS 'When true, the reporter identity is hidden from public view (but still tracked for moderation)';

-- Update RLS policies to handle anonymous reports
-- The SELECT policy should hide user_profile data for anonymous reports
-- This is handled in the application layer, but we document it here

-- Note: The user_id is still required and tracked for:
-- 1. Preventing abuse and spam
-- 2. Allowing admins to moderate and contact reporters if needed
-- 3. Maintaining data integrity and audit trails
-- 4. Allowing users to manage their own anonymous reports

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;

