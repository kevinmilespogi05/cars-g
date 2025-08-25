-- Admin-adjustable per-user report quota
CREATE TABLE IF NOT EXISTS public.report_quotas (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  daily_limit integer NOT NULL DEFAULT 20,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Helper to set quota
CREATE OR REPLACE FUNCTION public.set_report_quota(p_user uuid, p_limit integer)
RETURNS void AS $$
BEGIN
  INSERT INTO public.report_quotas(user_id, daily_limit)
  VALUES (p_user, p_limit)
  ON CONFLICT (user_id)
  DO UPDATE SET daily_limit = EXCLUDED.daily_limit, updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update can_create_report to use quota if present, else default 20
CREATE OR REPLACE FUNCTION public.can_create_report(user_uuid uuid)
RETURNS boolean AS $$
DECLARE
  count_24h int;
  limit_24h int;
BEGIN
  SELECT COALESCE((SELECT daily_limit FROM public.report_quotas WHERE user_id = user_uuid), 20) INTO limit_24h;
  SELECT COUNT(*) INTO count_24h
  FROM public.reports
  WHERE user_id = user_uuid
    AND created_at > (now() - interval '24 hours');
  RETURN count_24h < limit_24h;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


