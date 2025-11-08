-- COMPLETE FIX: Copy and run this entire script in Supabase SQL Editor
-- This will fix the status constraint to allow 'declined'

-- First, let's see what constraints exist
SELECT '=== CURRENT CONSTRAINTS ===' as step;
SELECT conname as constraint_name, pg_get_constraintdef(oid) as definition 
FROM pg_constraint 
WHERE conrelid = 'user_verification_requests'::regclass 
AND contype = 'c';

-- Update any 'rejected' statuses to 'declined'
UPDATE user_verification_requests 
SET status = 'declined' 
WHERE status = 'rejected';

-- Drop ALL check constraints on this table (we'll recreate the right one)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'user_verification_requests'::regclass 
        AND contype = 'c'
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE user_verification_requests DROP CONSTRAINT %I CASCADE', r.conname);
            RAISE NOTICE 'Dropped: %', r.conname;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error dropping %: %', r.conname, SQLERRM;
        END;
    END LOOP;
END $$;

-- Verify constraints are gone
SELECT '=== AFTER DROP (should be empty) ===' as step;
SELECT conname as constraint_name, pg_get_constraintdef(oid) as definition 
FROM pg_constraint 
WHERE conrelid = 'user_verification_requests'::regclass 
AND contype = 'c';

-- Add the new constraint with 'declined'
ALTER TABLE user_verification_requests 
ADD CONSTRAINT user_verification_requests_status_check 
CHECK (status IN ('pending', 'approved', 'declined', 'ai_processing'));

-- Verify the new constraint
SELECT '=== NEW CONSTRAINT ===' as step;
SELECT conname as constraint_name, pg_get_constraintdef(oid) as definition 
FROM pg_constraint 
WHERE conrelid = 'user_verification_requests'::regclass 
AND conname = 'user_verification_requests_status_check';

-- Test: Check if any rows have invalid statuses
SELECT '=== VALIDATION ===' as step;
SELECT status, COUNT(*) as count
FROM user_verification_requests
WHERE status NOT IN ('pending', 'approved', 'declined', 'ai_processing')
GROUP BY status;

