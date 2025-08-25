-- Enforce images length <= 5 (for text[] column)
ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_images_length_check,
  ADD CONSTRAINT reports_images_length_check
  CHECK (
    images IS NULL
    OR array_length(images, 1) <= 5
  );

-- Simple per-user rate limit: at most 20 reports per 24 hours
CREATE OR REPLACE FUNCTION public.can_create_report(user_uuid uuid)
RETURNS boolean AS $$
DECLARE
  count_24h int;
BEGIN
  SELECT COUNT(*) INTO count_24h
  FROM public.reports
  WHERE user_id = user_uuid
    AND created_at > (now() - interval '24 hours');
  RETURN count_24h < 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy: deny insert if over quota (RLS must be enabled on reports)
DROP POLICY IF EXISTS reports_rate_limit_insert ON public.reports;
CREATE POLICY reports_rate_limit_insert ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (public.can_create_report(user_id));


