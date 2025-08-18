-- Reset achievement progress counters in user_stats
-- USAGE: Run in Supabase SQL editor to zero out progress bars.

UPDATE public.user_stats
SET 
  reports_submitted = 0,
  reports_verified = 0,
  reports_resolved = 0,
  days_active = 0,
  total_points = 0,
  updated_at = NOW();

-- Verify
SELECT user_id, reports_submitted, reports_verified, reports_resolved, days_active, total_points
FROM public.user_stats
ORDER BY user_id
LIMIT 50;


