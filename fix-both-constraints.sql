-- Fix BOTH constraints: user_verification_requests AND profiles
-- Run this entire script in Supabase SQL Editor

-- ============================================
-- PART 1: Fix user_verification_requests constraint
-- ============================================

-- Check current statuses
SELECT '=== user_verification_requests: Current statuses ===' as step;
SELECT status, COUNT(*) as count
FROM user_verification_requests
GROUP BY status
ORDER BY status;

-- Fix data first
UPDATE user_verification_requests 
SET status = 'declined' 
WHERE status = 'rejected';

UPDATE user_verification_requests 
SET status = 'pending' 
WHERE status = 'ai_processing';

-- Drop constraint
ALTER TABLE user_verification_requests 
DROP CONSTRAINT IF EXISTS user_verification_requests_status_check CASCADE;

-- Add new constraint
ALTER TABLE user_verification_requests 
ADD CONSTRAINT user_verification_requests_status_check 
CHECK (status IN ('pending', 'approved', 'declined'));

-- Verify
SELECT '=== user_verification_requests: New constraint ===' as step;
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'user_verification_requests'::regclass 
AND conname = 'user_verification_requests_status_check';

-- ============================================
-- PART 2: Fix profiles verification_status constraint
-- ============================================

-- Check current statuses
SELECT '=== profiles: Current verification_status values ===' as step;
SELECT verification_status, COUNT(*) as count
FROM profiles
WHERE verification_status IS NOT NULL
GROUP BY verification_status
ORDER BY verification_status;

-- Fix data first
UPDATE profiles
SET verification_status = 'declined'
WHERE verification_status = 'rejected';

-- Drop constraint
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_verification_status_check CASCADE;

-- Add new constraint with 'declined' included
ALTER TABLE profiles 
ADD CONSTRAINT profiles_verification_status_check 
CHECK (verification_status IN (
    'pending_email_otp', 
    'pending_email_verification', 
    'pending_id_verification', 
    'pending_admin_approval', 
    'pending', 
    'active', 
    'verified', 
    'declined', 
    'ai_verified'
));

-- Verify
SELECT '=== profiles: New constraint ===' as step;
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'profiles'::regclass 
AND conname = 'profiles_verification_status_check';

-- ============================================
-- FINAL VALIDATION
-- ============================================

SELECT '=== SUCCESS! Both constraints fixed ===' as step;
SELECT 'You can now approve/decline verification requests without errors.' as message;

