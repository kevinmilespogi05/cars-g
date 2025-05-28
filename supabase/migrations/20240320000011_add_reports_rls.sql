-- Enable RLS on reports table
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

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