-- Reset all user points in profiles and user_stats
-- USAGE: Run this in your Supabase SQL editor. Review carefully before executing.

-- 1) Set all profile points to zero
UPDATE public.profiles
SET points = 0;

-- 2) Set aggregated points in user_stats to zero (if the table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'user_stats'
  ) THEN
    UPDATE public.user_stats
    SET total_points = 0;
  END IF;
END $$;

-- Optional: clear points history (uncomment if you want to wipe historical point events)
-- TRUNCATE TABLE public.points_history;

-- Optional: log an admin activity (uncomment if you keep an activities table and want an audit trail)
-- INSERT INTO public.activities (user_id, type, description, created_at)
-- SELECT id, 'points_earned', 'Admin reset points to 0', NOW()
-- FROM public.profiles;

-- Verify
SELECT 'Profiles points reset' AS info, COUNT(*) AS affected FROM public.profiles WHERE points = 0;
-- If user_stats exists
-- SELECT 'User stats reset' AS info, COUNT(*) AS affected FROM public.user_stats WHERE total_points = 0;


