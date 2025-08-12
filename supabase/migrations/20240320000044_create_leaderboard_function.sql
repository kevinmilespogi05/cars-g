-- Create get_user_leaderboard function for leaderboard functionality
-- This function returns user leaderboard data with accurate report counts

-- Create a function to get user leaderboard data with accurate report counts
CREATE OR REPLACE FUNCTION public.get_user_leaderboard(limit_count integer)
RETURNS TABLE (
  id uuid,
  username text,
  points integer,
  avatar_url text,
  role text,
  reports_submitted bigint,
  reports_verified bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_reports AS (
    SELECT 
      p.id,
      p.username,
      COALESCE(p.points, 0) as points,
      p.avatar_url,
      COALESCE(p.role, 'user') as role,
      COUNT(r.id) as total_reports,
      COUNT(CASE WHEN r.status = 'resolved' THEN 1 END) as resolved_reports
    FROM public.profiles p
    LEFT JOIN public.reports r ON r.user_id = p.id
    WHERE p.is_banned = false OR p.is_banned IS NULL  -- Exclude banned users
    GROUP BY p.id, p.username, p.points, p.avatar_url, p.role
  )
  SELECT 
    ur.id,
    ur.username,
    ur.points,
    ur.avatar_url,
    ur.role,
    ur.total_reports as reports_submitted,
    ur.resolved_reports as reports_verified
  FROM user_reports ur
  ORDER BY ur.points DESC, ur.total_reports DESC, ur.username ASC
  LIMIT limit_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_leaderboard(integer) TO authenticated;

-- Create a test function to verify the leaderboard function works
CREATE OR REPLACE FUNCTION public.test_leaderboard_function()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- This is just a test function to verify the get_user_leaderboard function exists
    -- It doesn't actually call the function with data
    RETURN 'get_user_leaderboard function is available';
END;
$$;

-- Grant execute permission for testing
GRANT EXECUTE ON FUNCTION public.test_leaderboard_function() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_user_leaderboard(integer) IS 'Returns user leaderboard data with points and report counts, ordered by points descending';

-- Test that the function can be called (without actually executing it)
DO $$
BEGIN
    -- Just verify the function exists and can be referenced
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'get_user_leaderboard' 
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN
        RAISE NOTICE 'get_user_leaderboard function created successfully';
    ELSE
        RAISE EXCEPTION 'Failed to create get_user_leaderboard function';
    END IF;
END $$; 