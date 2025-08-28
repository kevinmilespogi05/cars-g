-- Add patrol_user_id column to reports table to track which patrol officer accepted the job
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS patrol_user_id UUID REFERENCES public.profiles(id);

-- Create index for better performance on patrol assignments
CREATE INDEX IF NOT EXISTS idx_reports_patrol_user_id ON public.reports(patrol_user_id);

-- Update RLS policies to allow patrol users to update reports they've accepted
DROP POLICY IF EXISTS "Patrol users can update accepted reports" ON public.reports;
CREATE POLICY "Patrol users can update accepted reports"
    ON public.reports FOR UPDATE
    USING (
        patrol_user_id = auth.uid() 
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role = 'patrol'
        )
    );

-- Allow patrol users to view all reports (they need to see available jobs)
DROP POLICY IF EXISTS "Patrol users can view all reports" ON public.reports;
CREATE POLICY "Patrol users can view all reports"
    ON public.reports FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role = 'patrol'
        )
    );

-- Grant permissions to authenticated users
GRANT SELECT, UPDATE ON public.reports TO authenticated;
