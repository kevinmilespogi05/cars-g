-- FINAL FIX: Run this entire script in Supabase SQL Editor
-- This will definitely fix the constraint issue

BEGIN;

-- Step 1: Check what we're working with
\echo 'Step 1: Checking current constraints...'
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'user_verification_requests'::regclass 
AND contype = 'c';

-- Step 2: Update any 'rejected' to 'declined' first
\echo 'Step 2: Updating rejected statuses...'
UPDATE user_verification_requests 
SET status = 'declined' 
WHERE status = 'rejected';

-- Step 3: Drop the constraint - try multiple ways
\echo 'Step 3: Dropping constraint...'

-- Method 1: Direct drop
ALTER TABLE user_verification_requests 
DROP CONSTRAINT IF EXISTS user_verification_requests_status_check;

-- Method 2: Drop with CASCADE
ALTER TABLE user_verification_requests 
DROP CONSTRAINT IF EXISTS user_verification_requests_status_check CASCADE;

-- Method 3: Drop all check constraints on this table
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'user_verification_requests'::regclass
        AND contype = 'c'
        AND (pg_get_constraintdef(oid) LIKE '%status%' OR conname LIKE '%status%')
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE user_verification_requests DROP CONSTRAINT %I CASCADE', constraint_record.conname);
            RAISE NOTICE 'Dropped constraint: %', constraint_record.conname;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not drop constraint %: %', constraint_record.conname, SQLERRM;
        END;
    END LOOP;
END $$;

-- Step 4: Verify constraint is gone
\echo 'Step 4: Verifying constraint is dropped...'
SELECT conname 
FROM pg_constraint 
WHERE conrelid = 'user_verification_requests'::regclass 
AND contype = 'c'
AND (pg_get_constraintdef(oid) LIKE '%status%' OR conname LIKE '%status%');

-- Step 5: Add the new constraint
\echo 'Step 5: Adding new constraint with declined...'
ALTER TABLE user_verification_requests 
ADD CONSTRAINT user_verification_requests_status_check 
CHECK (status IN ('pending', 'approved', 'declined', 'ai_processing'));

-- Step 6: Verify it was added
\echo 'Step 6: Verifying new constraint...'
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'user_verification_requests'::regclass 
AND conname = 'user_verification_requests_status_check';

COMMIT;

-- Final test: This should now work
\echo 'Testing: Try updating a row to declined status...'
-- You can test with your actual request ID
-- UPDATE user_verification_requests SET status = 'declined' WHERE id = 'your-request-id-here';

