-- COMPLETE FIX: Fix data first, then update constraint
-- Also removes 'ai_processing' from allowed statuses as requested

-- Step 1: Check what invalid statuses exist in the table
SELECT '=== INVALID STATUSES IN TABLE ===' as step;
SELECT status, COUNT(*) as count
FROM user_verification_requests
WHERE status NOT IN ('pending', 'approved', 'declined')
GROUP BY status
ORDER BY count DESC;

-- Step 2: Fix invalid statuses
-- Update 'rejected' to 'declined'
UPDATE user_verification_requests 
SET status = 'declined' 
WHERE status = 'rejected';

-- Update 'ai_processing' to 'pending' (since we're removing it)
UPDATE user_verification_requests 
SET status = 'pending' 
WHERE status = 'ai_processing';

-- Update any other unknown statuses to 'pending' as fallback
UPDATE user_verification_requests 
SET status = 'pending' 
WHERE status NOT IN ('pending', 'approved', 'declined');

-- Step 3: Verify all statuses are now valid
SELECT '=== VERIFICATION (should only show pending/approved/declined) ===' as step;
SELECT status, COUNT(*) as count
FROM user_verification_requests
GROUP BY status
ORDER BY status;

-- Step 4: Drop the existing constraint
ALTER TABLE user_verification_requests 
DROP CONSTRAINT IF EXISTS user_verification_requests_status_check CASCADE;

-- Step 5: Add the new constraint (without 'ai_processing')
ALTER TABLE user_verification_requests 
ADD CONSTRAINT user_verification_requests_status_check 
CHECK (status IN ('pending', 'approved', 'declined'));

-- Step 6: Verify the constraint was created
SELECT '=== NEW CONSTRAINT ===' as step;
SELECT conname as constraint_name, pg_get_constraintdef(oid) as definition 
FROM pg_constraint 
WHERE conrelid = 'user_verification_requests'::regclass 
AND conname = 'user_verification_requests_status_check';

-- Step 7: Final validation - check for any invalid statuses
SELECT '=== FINAL VALIDATION (should be empty) ===' as step;
SELECT status, COUNT(*) as count
FROM user_verification_requests
WHERE status NOT IN ('pending', 'approved', 'declined')
GROUP BY status;

