-- Create a function to get user leaderboard data with accurate report counts
CREATE OR REPLACE FUNCTION get_user_leaderboard(limit_count integer)
RETURNS TABLE (
  id uuid,
  username text,
  points integer,
  avatar_url text,
  role text,
  reports_submitted bigint,
  reports_verified bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH user_reports AS (
    SELECT 
      p.id,
      p.username,
      p.points,
      p.avatar_url,
      p.role,
      COUNT(r.id) as total_reports,
      COUNT(CASE WHEN r.status = 'resolved' THEN 1 END) as resolved_reports
    FROM profiles p
    LEFT JOIN reports r ON r.user_id = p.id
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
  ORDER BY ur.points DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql; 