-- SIMPLE FIX: Fix profiles.verification_status constraint
-- Run this ENTIRE script in Supabase SQL Editor

-- Step 1: Drop the constraint (this allows us to fix data)
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_verification_status_check CASCADE;

-- Step 2: Fix any invalid data (now that constraint is dropped)
UPDATE profiles
SET verification_status = 'declined'
WHERE verification_status = 'rejected';

-- Step 3: Add the constraint back with 'declined' included
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

-- Step 4: Verify it worked
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'profiles'::regclass
AND conname = 'profiles_verification_status_check';

-- Step 5: Test - this should work now
SELECT 'SUCCESS! Constraint now allows "declined"' as message;
SELECT COUNT(*) as declined_count
FROM profiles
WHERE verification_status = 'declined';

