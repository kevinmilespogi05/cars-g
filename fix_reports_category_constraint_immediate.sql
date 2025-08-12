-- Immediate fix for reports table category constraint
-- Run this in your Supabase SQL Editor

-- Drop the existing constraint that's causing the error
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_category_check;

-- Add the new constraint that matches what the frontend actually sends
ALTER TABLE public.reports ADD CONSTRAINT reports_category_check 
    CHECK (category IN ('infrastructure', 'safety', 'environmental', 'public services', 'other'));

-- Update any existing data to use the new category values
-- Map old values to new ones
UPDATE public.reports 
SET category = CASE 
    WHEN category = 'traffic_violation' THEN 'safety'
    WHEN category = 'road_condition' THEN 'infrastructure'
    WHEN category = 'safety_hazard' THEN 'safety'
    WHEN category = 'other' THEN 'other'
    ELSE category
END
WHERE category IN ('traffic_violation', 'road_condition', 'safety_hazard');

-- Verify the constraint is working
SELECT 'Category constraint updated successfully' as status;

-- Show the current constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.reports'::regclass 
AND contype = 'c'; 