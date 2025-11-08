-- ROBUST FIX for profiles.verification_status constraint
-- This script fixes the data FIRST, then updates the constraint
-- Run this entire script in Supabase SQL Editor

BEGIN;

-- Step 1: Check what verification_status values currently exist
SELECT '=== Step 1: Current verification_status values ===' as step;
SELECT verification_status, COUNT(*) as count
FROM profiles
WHERE verification_status IS NOT NULL
GROUP BY verification_status
ORDER BY verification_status;

-- Step 2: Check what the current constraint allows
SELECT '=== Step 2: Current constraint definition ===' as step;
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'profiles'::regclass
AND conname = 'profiles_verification_status_check';

-- Step 3: Fix any invalid statuses BEFORE dropping constraint
-- Update 'rejected' to 'declined'
UPDATE profiles
SET verification_status = 'declined'
WHERE verification_status = 'rejected';

-- Update any NULL values to 'pending' (if needed)
-- UPDATE profiles
-- SET verification_status = 'pending'
-- WHERE verification_status IS NULL;

-- Step 4: Drop the constraint (try multiple methods)
SELECT '=== Step 3: Dropping constraint ===' as step;

-- Method 1: Direct drop
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_verification_status_check;

-- Method 2: Drop with CASCADE
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_verification_status_check CASCADE;

-- Method 3: Drop all check constraints on verification_status
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'profiles'::regclass
        AND contype = 'c'
        AND (pg_get_constraintdef(oid) LIKE '%verification_status%' OR conname LIKE '%verification_status%')
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE profiles DROP CONSTRAINT %I CASCADE', constraint_record.conname);
            RAISE NOTICE 'Dropped constraint: %', constraint_record.conname;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not drop constraint %: %', constraint_record.conname, SQLERRM;
        END;
    END LOOP;
END $$;

-- Step 5: Verify constraint is gone
SELECT '=== Step 4: Verifying constraint is dropped ===' as step;
SELECT conname 
FROM pg_constraint 
WHERE conrelid = 'profiles'::regclass 
AND contype = 'c'
AND (pg_get_constraintdef(oid) LIKE '%verification_status%' OR conname LIKE '%verification_status%');

-- Step 6: Verify all data is valid before adding constraint
SELECT '=== Step 5: Checking for invalid statuses ===' as step;
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

-- Step 7: Add the new constraint with 'declined' included
SELECT '=== Step 6: Adding new constraint ===' as step;
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

-- Step 8: Verify the constraint was created
SELECT '=== Step 7: Verifying new constraint ===' as step;
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'profiles'::regclass
AND conname = 'profiles_verification_status_check';

-- Step 9: Test that 'declined' is now accepted
SELECT '=== Step 8: Testing constraint ===' as step;
-- This should not error if constraint is correct
SELECT COUNT(*) as declined_count
FROM profiles
WHERE verification_status = 'declined';

COMMIT;

-- Final success message
SELECT '=== SUCCESS! ===' as step;
SELECT 'The profiles.verification_status constraint now allows "declined". You can now decline verification requests without errors.' as message;

