-- Create optimized award_points function
CREATE OR REPLACE FUNCTION award_points(
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
BEGIN
  -- Update points in profile and get the new total
  UPDATE profiles 
  SET points = COALESCE(points, 0) + points_to_award
  WHERE id = user_id
  RETURNING points INTO new_points;
  
  -- Insert points history record
  INSERT INTO points_history (user_id, points, reason, report_id)
  VALUES (user_id, points_to_award, reason_text, report_id);
  
  RETURN points_to_award;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION award_points(UUID, INTEGER, TEXT, UUID) TO authenticated; 