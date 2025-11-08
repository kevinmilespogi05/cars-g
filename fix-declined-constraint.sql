-- Fix the profiles verification_status constraint to allow 'declined' and all other required statuses
-- This ensures the admin dashboard can properly decline verification requests

-- Step 1: Drop the existing constraint
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_verification_status_check;

-- Step 2: Add the updated constraint with all required statuses
ALTER TABLE public.profiles 
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

-- Step 3: Verify the constraint is working
DO $$
DECLARE
    invalid_statuses text[];
BEGIN
    SELECT array_agg(DISTINCT verification_status)
    INTO invalid_statuses
    FROM public.profiles
    WHERE verification_status NOT IN (
      'pending_email_otp', 
      'pending_email_verification', 
      'pending_id_verification', 
      'pending_admin_approval', 
      'pending', 
      'active', 
      'verified', 
      'declined', 
      'ai_verified'
    );
    
    IF array_length(invalid_statuses, 1) > 0 THEN
        RAISE WARNING 'Found invalid statuses that violate the new constraint: %', invalid_statuses;
    ELSE
        RAISE NOTICE 'Constraint validation passed - all existing data conforms to the new constraint';
    END IF;
END $$;

-- Add comment to document valid values
COMMENT ON COLUMN public.profiles.verification_status IS 'Valid values: pending_email_otp, pending_email_verification, pending_id_verification, pending_admin_approval, pending, active, verified, declined, ai_verified';
