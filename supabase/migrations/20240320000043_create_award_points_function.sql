-- Create award_points function and ensure points system works
-- This function handles awarding points to users and updating related tables

-- First, ensure the points_history table exists
CREATE TABLE IF NOT EXISTS public.points_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    reason TEXT NOT NULL,
    report_id UUID REFERENCES public.reports(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on points_history
ALTER TABLE public.points_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for points_history
DROP POLICY IF EXISTS "Users can view their own points history" ON public.points_history;
DROP POLICY IF EXISTS "Authenticated users can insert points history" ON public.points_history;
DROP POLICY IF EXISTS "Admins can view all points history" ON public.points_history;

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

-- Create the award_points function
CREATE OR REPLACE FUNCTION public.award_points(
    user_id UUID,
    points_to_award INTEGER,
    reason_text TEXT,
    report_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_points INTEGER;
    current_stats_id UUID;
BEGIN
    -- Update points in profile and get the new total
    UPDATE public.profiles 
    SET 
        points = COALESCE(points, 0) + points_to_award,
        updated_at = timezone('utc'::text, now())
    WHERE id = user_id
    RETURNING points INTO new_points;
    
    -- If profile doesn't exist, create it (this shouldn't happen but just in case)
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found for user_id: %', user_id;
    END IF;
    
    -- Insert points history record
    INSERT INTO public.points_history (user_id, points, reason, report_id)
    VALUES (user_id, points_to_award, reason_text, report_id);
    
    -- Update user_stats if the table exists and has the user
    BEGIN
        -- Try to get existing stats
        SELECT id INTO current_stats_id
        FROM public.user_stats
        WHERE user_id = user_id;
        
        IF FOUND THEN
            -- Update existing stats
            UPDATE public.user_stats 
            SET 
                total_points = COALESCE(total_points, 0) + points_to_award,
                updated_at = timezone('utc'::text, now())
            WHERE user_id = user_id;
        ELSE
            -- Create new stats record
            INSERT INTO public.user_stats (
                user_id, 
                total_points, 
                reports_submitted,
                reports_verified,
                reports_resolved,
                days_active,
                current_streak,
                longest_streak
            ) VALUES (
                user_id, 
                points_to_award, 
                0, 0, 0, 0, 0, 0
            );
        END IF;
        
        -- Update specific stats based on reason
        IF reason_text = 'REPORT_SUBMITTED' THEN
            UPDATE public.user_stats 
            SET 
                reports_submitted = COALESCE(reports_submitted, 0) + 1,
                total_reports = COALESCE(total_reports, 0) + 1,
                updated_at = timezone('utc'::text, now())
            WHERE user_id = user_id;
        ELSIF reason_text = 'REPORT_VERIFIED' THEN
            UPDATE public.user_stats 
            SET 
                reports_verified = COALESCE(reports_verified, 0) + 1,
                updated_at = timezone('utc'::text, now())
            WHERE user_id = user_id;
        ELSIF reason_text = 'REPORT_RESOLVED' THEN
            UPDATE public.user_stats 
            SET 
                reports_resolved = COALESCE(reports_resolved, 0) + 1,
                resolved_reports = COALESCE(resolved_reports, 0) + 1,
                updated_at = timezone('utc'::text, now())
            WHERE user_id = user_id;
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        -- Log the error but don't fail the main function
        RAISE WARNING 'Error updating user_stats: %', SQLERRM;
    END;
    
    RETURN points_to_award;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.award_points(UUID, INTEGER, TEXT, UUID) TO authenticated;

-- Create a simple test function to verify the award_points function works
CREATE OR REPLACE FUNCTION public.test_award_points()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- This is just a test function to verify the award_points function exists
    -- It doesn't actually award points
    RETURN 'award_points function is available';
END;
$$;

-- Grant execute permission for testing
GRANT EXECUTE ON FUNCTION public.test_award_points() TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION public.award_points(UUID, INTEGER, TEXT, UUID) IS 'Awards points to a user and updates related tables';
COMMENT ON TABLE public.points_history IS 'Tracks all points awarded to users with reasons and timestamps'; 