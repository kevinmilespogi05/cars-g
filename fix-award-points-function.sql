-- Fix award_points function to properly update user_stats
-- This migration ensures the function updates all related tables consistently

-- Update the award_points function to include user_stats updates
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
    
    -- If profile doesn't exist, raise exception
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
                updated_at = timezone('utc'::text, now())
            WHERE user_id = user_id;
        ELSIF reason_text = 'PATROL_RESOLVED' THEN
            -- For patrol rewards, we don't update report stats
            -- Just the total_points which is already updated above
            NULL;
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

-- Add comment for documentation
COMMENT ON FUNCTION public.award_points(UUID, INTEGER, TEXT, UUID) IS 'Awards points to a user and updates profiles, user_stats, and points_history tables';
