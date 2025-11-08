-- Fix profiles verification_status constraint to ensure 'declined' is allowed
-- Run this in Supabase SQL Editor

-- Step 1: Check current constraint
SELECT '=== CURRENT profiles.verification_status CONSTRAINT ===' as step;
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'profiles'::regclass
AND conname = 'profiles_verification_status_check';

-- Step 2: Check what verification_status values currently exist
SELECT '=== CURRENT verification_status VALUES ===' as step;
SELECT verification_status, COUNT(*) as count
FROM profiles
WHERE verification_status IS NOT NULL
GROUP BY verification_status
ORDER BY verification_status;

-- Step 3: Update any invalid statuses to valid ones
-- Update 'rejected' to 'declined' if it exists
UPDATE profiles
SET verification_status = 'declined'
WHERE verification_status = 'rejected';

-- Step 4: Drop the existing constraint
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_verification_status_check CASCADE;

-- Step 5: Add the new constraint with 'declined' included
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

-- Step 6: Verify the constraint was created correctly
SELECT '=== NEW CONSTRAINT ===' as step;
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'profiles'::regclass
AND conname = 'profiles_verification_status_check';

-- Step 7: Verify no invalid statuses exist
SELECT '=== VALIDATION (should be empty) ===' as step;
SELECT verification_status, COUNT(*) as count
FROM profiles
WHERE verification_status IS NOT NULL
AND verification_status NOT IN (
    'pending_email_otp', 
    'pending_email_verification', 
    'pending_id_verification', 
    'pending_admin_approval', 
    'pending', 
    'active', 
    'verified', 
    'declined', 
    'ai_verified'
)
GROUP BY verification_status;

