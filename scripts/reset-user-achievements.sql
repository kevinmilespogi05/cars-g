-- Reset all earned achievements for all users
-- USAGE: Run this in your Supabase SQL editor. Review carefully before executing.

-- Option 1: Safe delete (preserves table identity values)
DELETE FROM public.user_achievements;

-- Option 2: Full truncate (uncomment if you want to reset identity and cascade if there are dependent rows)
-- TRUNCATE TABLE public.user_achievements RESTART IDENTITY;

-- Optional: If you also logged activities for achievements, you may clear them as well (adjust type value if different)
-- DELETE FROM public.activities WHERE type = 'achievement_earned';

-- Verify
SELECT 'User achievements cleared' AS info, COUNT(*) AS remaining FROM public.user_achievements;


