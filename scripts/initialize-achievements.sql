-- Initialize achievements in the database
-- This script should be run once to set up the achievements table

-- Clear existing achievements (if any)
DELETE FROM public.achievements;

-- Insert the 5 achievements
INSERT INTO public.achievements (id, title, description, points, icon, requirement_type, requirement_count, criteria) VALUES
(
  'first_report',
  'First Report',
  'Submit your first community issue report',
  25,
  '📝',
  'reports_submitted',
  1,
  '{"reports_count": 1}'
),
(
  'reporting_streak',
  'Reporting Streak',
  'Submit reports for 7 consecutive days',
  100,
  '🔥',
  'days_active',
  7,
  '{"days_active": 7}'
),
(
  'verified_reporter',
  'Verified Reporter',
  'Have 5 reports verified by administrators',
  150,
  '✅',
  'reports_verified',
  5,
  '{"verified_reports": 5}'
),
(
  'community_champion',
  'Community Champion',
  'Earn 1000 total points',
  200,
  '🏆',
  'points_earned',
  1000,
  '{"total_points": 1000}'
),
(
  'problem_solver',
  'Problem Solver',
  'Have 10 reports resolved',
  300,
  '🔧',
  'reports_resolved',
  10,
  '{"resolved_reports": 10}'
);

-- Verify the achievements were inserted
SELECT id, title, points, requirement_type, requirement_count FROM public.achievements ORDER BY points ASC;
