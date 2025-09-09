-- Backfill service level (priority_level) from priority for existing reports
-- Mapping: low -> 1, medium -> 3, high -> 5

BEGIN;

-- Update only rows where priority_level is NULL and priority is recognized
UPDATE reports
SET priority_level = CASE priority
  WHEN 'high' THEN 5
  WHEN 'medium' THEN 3
  WHEN 'low' THEN 1
  ELSE NULL
END
WHERE priority_level IS NULL
  AND priority IN ('low','medium','high');

COMMIT;

-- Optional verification (uncomment to inspect remaining rows without level)
-- SELECT id, priority, priority_level FROM reports WHERE priority_level IS NULL;


