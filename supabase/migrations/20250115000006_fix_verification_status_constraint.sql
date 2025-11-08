-- Fix user_verification_requests status constraint to ensure 'declined' is allowed
-- This migration updates the constraint to match the application requirements
-- Also removes 'ai_processing' from allowed statuses

-- Step 1: Fix existing data - update invalid statuses to valid ones
-- Update 'rejected' to 'declined'
UPDATE public.user_verification_requests
SET status = 'declined'
WHERE status = 'rejected';

-- Update 'ai_processing' to 'pending' (since we're removing it from allowed statuses)
UPDATE public.user_verification_requests
SET status = 'pending'
WHERE status = 'ai_processing';

-- Update any other unknown statuses to 'pending' as fallback
UPDATE public.user_verification_requests
SET status = 'pending'
WHERE status NOT IN ('pending', 'approved', 'declined');

-- Step 2: Find and drop all status check constraints on this table
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Get all check constraints on the status column
    FOR constraint_name IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.user_verification_requests'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) LIKE '%status%'
    LOOP
        EXECUTE format('ALTER TABLE public.user_verification_requests DROP CONSTRAINT IF EXISTS %I CASCADE', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;
END $$;

-- Step 3: Add the updated constraint with 'declined' status (without 'ai_processing')
ALTER TABLE public.user_verification_requests 
ADD CONSTRAINT user_verification_requests_status_check 
CHECK (status IN ('pending', 'approved', 'declined'));

-- Step 4: Update the comment to document the valid status values
COMMENT ON COLUMN public.user_verification_requests.status IS 'Valid values: pending, approved, declined';

-- Step 5: Verify the constraint is working by checking existing data
DO $$
DECLARE
    invalid_statuses text[];
BEGIN
    -- Check if there are any statuses that don't match the new constraint
    SELECT array_agg(DISTINCT status)
    INTO invalid_statuses
    FROM public.user_verification_requests
    WHERE status NOT IN ('pending', 'approved', 'declined');
    
    IF array_length(invalid_statuses, 1) > 0 THEN
        RAISE WARNING 'Found invalid statuses that violate the new constraint: %', invalid_statuses;
    ELSE
        RAISE NOTICE 'Status constraint validation passed - all existing data conforms to new constraint';
    END IF;
END $$;

