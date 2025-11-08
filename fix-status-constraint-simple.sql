-- SIMPLE DIRECT FIX for user_verification_requests status constraint
-- Copy and paste this ENTIRE script into Supabase SQL Editor and run it

-- 1. Show current constraint
SELECT 'Current constraint:' as info, 
    conname, 
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'user_verification_requests'::regclass
AND conname LIKE '%status%';

-- 2. Drop the constraint (use the exact name from step 1 if it's different)
ALTER TABLE user_verification_requests 
DROP CONSTRAINT IF EXISTS user_verification_requests_status_check;

-- 3. Also try dropping with CASCADE in case there are dependencies
ALTER TABLE user_verification_requests 
DROP CONSTRAINT IF EXISTS user_verification_requests_status_check CASCADE;

-- 4. Add the new constraint
ALTER TABLE user_verification_requests 
ADD CONSTRAINT user_verification_requests_status_check 
CHECK (status IN ('pending', 'approved', 'declined', 'ai_processing'));

-- 5. Verify it worked
SELECT 'New constraint:' as info,
    conname, 
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'user_verification_requests'::regclass
AND conname = 'user_verification_requests_status_check';

