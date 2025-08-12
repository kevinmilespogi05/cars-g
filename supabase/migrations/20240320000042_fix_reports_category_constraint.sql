-- Fix reports table category constraint to match frontend code
-- The frontend sends: 'infrastructure', 'safety', 'environmental', 'public services', 'other'
-- But the database only allows: 'traffic_violation', 'road_condition', 'safety_hazard', 'other'

-- First, drop the existing constraint
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

-- Verify the constraint is working by checking existing data
DO $$
DECLARE
    invalid_categories text[];
BEGIN
    -- Check if there are any categories that don't match the new constraint
    SELECT array_agg(DISTINCT category)
    INTO invalid_categories
    FROM public.reports
    WHERE category NOT IN ('infrastructure', 'safety', 'environmental', 'public services', 'other');
    
    IF array_length(invalid_categories, 1) > 0 THEN
        RAISE EXCEPTION 'Found invalid categories that violate the new constraint: %', invalid_categories;
    ELSE
        RAISE NOTICE 'Category constraint validation passed - all existing data conforms to new constraint';
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON CONSTRAINT reports_category_check ON public.reports IS 'Ensures category is one of: infrastructure, safety, environmental, public services, other'; 