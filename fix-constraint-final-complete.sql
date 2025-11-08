-- FINAL COMPLETE FIX: Run this entire script in Supabase SQL Editor
-- This fixes the data and updates the constraint to allow 'declined' and remove 'ai_processing'

-- Step 1: Check what statuses currently exist (before fix)
SELECT '=== CURRENT STATUSES ===' as step;
SELECT status, COUNT(*) as count
FROM user_verification_requests
GROUP BY status
ORDER BY status;

-- Step 2: Drop the constraint FIRST (this allows us to fix the data)
ALTER TABLE user_verification_requests 
DROP CONSTRAINT IF EXISTS user_verification_requests_status_check CASCADE;

-- Step 3: Now we can fix the data (constraint is dropped, so updates will work)
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
WHERE status IS NULL OR status NOT IN ('pending', 'approved', 'declined');

-- Step 4: Verify all statuses are now valid
SELECT '=== STATUSES AFTER FIX ===' as step;
SELECT status, COUNT(*) as count
FROM user_verification_requests
GROUP BY status
ORDER BY status;

-- Step 5: Add the new constraint (without 'ai_processing', with 'declined')
ALTER TABLE user_verification_requests 
ADD CONSTRAINT user_verification_requests_status_check 
CHECK (status IN ('pending', 'approved', 'declined'));

-- Step 6: Verify the constraint was created correctly
SELECT '=== NEW CONSTRAINT ===' as step;
SELECT conname as constraint_name, pg_get_constraintdef(oid) as definition 
FROM pg_constraint 
WHERE conrelid = 'user_verification_requests'::regclass 
AND conname = 'user_verification_requests_status_check';

-- Step 7: Final validation - should be empty (no invalid statuses)
SELECT '=== FINAL VALIDATION (should be empty) ===' as step;
SELECT status, COUNT(*) as count
FROM user_verification_requests
WHERE status NOT IN ('pending', 'approved', 'declined')
GROUP BY status;

-- Step 8: Success message
SELECT '=== SUCCESS! ===' as step;
SELECT 'Constraint updated successfully. Status can now be: pending, approved, or declined' as message;

