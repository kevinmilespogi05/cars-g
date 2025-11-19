-- Add onboarding_completed column to profiles table
-- This tracks whether a user has completed the onboarding flow

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Create index for onboarding status queries
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed ON public.profiles(onboarding_completed);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.onboarding_completed IS 'Whether the user has completed the onboarding flow';

