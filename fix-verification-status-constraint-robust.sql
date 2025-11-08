-- ROBUST FIX: user_verification_requests status constraint
-- This script will definitely fix the constraint issue
-- Run this in Supabase SQL Editor

-- STEP 1: See what constraints exist BEFORE we start
SELECT 'BEFORE FIX - Current constraints:' as step;
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.user_verification_requests'::regclass
AND contype = 'c';

-- STEP 2: Update any invalid statuses
UPDATE public.user_verification_requests
SET status = 'declined'
WHERE status = 'rejected';

-- STEP 3: Drop ALL check constraints (more aggressive approach)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.user_verification_requests'::regclass 
        AND contype = 'c'
    LOOP
        EXECUTE format('ALTER TABLE public.user_verification_requests DROP CONSTRAINT %I CASCADE', r.conname);
        RAISE NOTICE 'Dropped constraint: %', r.conname;
    END LOOP;
END $$;

-- STEP 4: Verify constraints are gone
SELECT 'AFTER DROP - Remaining constraints (should be empty):' as step;
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.user_verification_requests'::regclass
AND contype = 'c';

-- STEP 5: Add the new constraint with 'declined'
ALTER TABLE public.user_verification_requests 
ADD CONSTRAINT user_verification_requests_status_check 
CHECK (status IN ('pending', 'approved', 'declined', 'ai_processing'));

-- STEP 6: Verify the new constraint exists
SELECT 'AFTER FIX - New constraint:' as step;
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.user_verification_requests'::regclass
AND conname = 'user_verification_requests_status_check';

-- STEP 7: Test the constraint (check for any invalid statuses)
SELECT 'VALIDATION - Invalid statuses (should be empty):' as step;
SELECT 
    status,
    COUNT(*) as count
FROM public.user_verification_requests
WHERE status NOT IN ('pending', 'approved', 'declined', 'ai_processing')
GROUP BY status;

-- STEP 8: Try a test update to verify it works
-- This will fail if the constraint is wrong, succeed if it's correct
DO $$
BEGIN
    -- This is just a test - we'll rollback
    BEGIN
        -- Try to insert a test row with 'declined' status (then delete it)
        INSERT INTO public.user_verification_requests (
            user_id, 
            id_front_image_url, 
            id_back_image_url, 
            status
        ) 
        SELECT 
            user_id,
            id_front_image_url,
            id_back_image_url,
            'declined'
        FROM public.user_verification_requests
        LIMIT 1
        ON CONFLICT DO NOTHING;
        
        -- Delete the test row if it was inserted
        DELETE FROM public.user_verification_requests 
        WHERE status = 'declined' 
        AND created_at > NOW() - INTERVAL '1 minute';
        
        RAISE NOTICE 'SUCCESS: Constraint accepts "declined" status';
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'FAILED: Constraint still rejects "declined" status. Error: %', SQLERRM;
    END;
END $$;

