-- Update leaderboard functions to exclude admin users by default
-- Run this in your Supabase SQL Editor

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.get_user_leaderboard(integer);
DROP FUNCTION IF EXISTS public.get_admin_leaderboard(integer);

-- Create updated function that excludes admin users by default
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
    WHERE (p.is_banned = false OR p.is_banned IS NULL)  -- Exclude banned users
      AND p.role != 'admin'  -- Exclude admin users by default
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

-- Create separate function for admin users to see all users including admins
CREATE OR REPLACE FUNCTION public.get_admin_leaderboard(limit_count integer)
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
    WHERE (p.is_banned = false OR p.is_banned IS NULL)  -- Exclude banned users only
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
GRANT EXECUTE ON FUNCTION public.get_admin_leaderboard(integer) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION public.get_user_leaderboard(integer) IS 'Returns user leaderboard data with points and report counts, excluding admin users, ordered by points descending';
COMMENT ON FUNCTION public.get_admin_leaderboard(integer) IS 'Returns user leaderboard data with points and report counts, including admin users, ordered by points descending';

-- Test that the functions were created successfully
SELECT 'get_user_leaderboard function updated successfully' as status;
SELECT 'get_admin_leaderboard function created successfully' as status;

-- Show the function signatures
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN ('get_user_leaderboard', 'get_admin_leaderboard')
ORDER BY p.proname;
