-- Add missing columns to existing reports table
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS points_awarded INTEGER DEFAULT NULL;

-- Enable Row Level Security
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Drop policies that might already exist
DROP POLICY IF EXISTS "Users can view all reports" ON public.reports;
DROP POLICY IF EXISTS "Users can create their own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can update their own reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can update any report" ON public.reports;
DROP POLICY IF EXISTS "Admins can delete any report" ON public.reports;
DROP POLICY IF EXISTS "Users can delete their own reports" ON public.reports;

-- Allow all authenticated users to view reports
CREATE POLICY "Users can view all reports"
    ON public.reports FOR SELECT
    USING (true);

-- Allow users to create their own reports
CREATE POLICY "Users can create their own reports"
    ON public.reports FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own reports
CREATE POLICY "Users can update their own reports"
    ON public.reports FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Allow admins to update any report
CREATE POLICY "Admins can update any report"
    ON public.reports FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- Allow admins to delete any report
CREATE POLICY "Admins can delete any report"
    ON public.reports FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- Allow users to delete their own reports
CREATE POLICY "Users can delete their own reports"
    ON public.reports FOR DELETE
    USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_category ON public.reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_reports_updated_at ON public.reports;
CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON public.reports
    FOR EACH ROW
    EXECUTE FUNCTION update_reports_updated_at();

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated; 