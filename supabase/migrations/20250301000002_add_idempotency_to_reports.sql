-- Add idempotency support to reports to prevent duplicate creations on retries
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS idempotency_key text;

-- Ensure uniqueness when provided, allow NULLs
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_idempotency_key
  ON public.reports(idempotency_key)
  WHERE idempotency_key IS NOT NULL;


