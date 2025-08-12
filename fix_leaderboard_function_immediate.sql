-- Immediate fix for get_user_leaderboard function
-- Run this in your Supabase SQL Editor

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

-- Test that the function exists
SELECT 'get_user_leaderboard function created successfully' as status;

-- Show the function signature
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
 