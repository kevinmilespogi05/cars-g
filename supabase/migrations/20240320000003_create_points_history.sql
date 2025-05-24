-- Create points_history table
CREATE TABLE IF NOT EXISTS public.points_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    reason TEXT NOT NULL,
    report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies for points_history
ALTER TABLE public.points_history ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own points history
CREATE POLICY "Users can view their own points history"
    ON public.points_history FOR SELECT
    USING (auth.uid() = user_id);

-- Allow authenticated users to insert points history
CREATE POLICY "Authenticated users can insert points history"
    ON public.points_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow admins to view all points history
CREATE POLICY "Admins can view all points history"
    ON public.points_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    ); 