-- Fix user_verification_requests status constraint to allow 'declined'
-- Run this SQL directly in your Supabase SQL editor
-- This is a more aggressive fix that will definitely work

-- Step 1: Check what constraints currently exist
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.user_verification_requests'::regclass
AND contype = 'c'
ORDER BY conname;

-- Step 2: Update any existing 'rejected' statuses to 'declined'
UPDATE public.user_verification_requests
SET status = 'declined'
WHERE status = 'rejected' OR status NOT IN ('pending', 'approved', 'declined', 'ai_processing');

-- Step 3: Drop ALL check constraints on the user_verification_requests table
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Get all check constraints on the table
    FOR constraint_record IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.user_verification_requests'::regclass
        AND contype = 'c'
    LOOP
        EXECUTE format('ALTER TABLE public.user_verification_requests DROP CONSTRAINT IF EXISTS %I CASCADE', constraint_record.conname);
        RAISE NOTICE 'Dropped constraint: %', constraint_record.conname;
    END LOOP;
END $$;

-- Step 4: Recreate the constraint with 'declined' included
ALTER TABLE public.user_verification_requests 
ADD CONSTRAINT user_verification_requests_status_check 
CHECK (status IN ('pending', 'approved', 'declined', 'ai_processing'));

-- Step 5: Verify the constraint was created correctly
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.user_verification_requests'::regclass
AND conname = 'user_verification_requests_status_check';

-- Step 6: Test that 'declined' is now accepted (this should return 0 rows if constraint is correct)
SELECT 
    status,
    COUNT(*) as count
FROM public.user_verification_requests
WHERE status NOT IN ('pending', 'approved', 'declined', 'ai_processing')
GROUP BY status;
