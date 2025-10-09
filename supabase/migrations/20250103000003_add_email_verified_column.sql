-- Add email_verified column to profiles table for email verification tracking

-- Add email_verified column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'email_verified'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN email_verified BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Update existing profiles to have email_verified = true (assuming they were verified through Supabase auth)
UPDATE public.profiles 
SET email_verified = true 
WHERE email_verified IS NULL;

-- Make email_verified column NOT NULL after setting default values
ALTER TABLE public.profiles 
ALTER COLUMN email_verified SET NOT NULL;

-- Create index for email_verified column for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email_verified ON public.profiles(email_verified);

-- Add comment to the column
COMMENT ON COLUMN public.profiles.email_verified IS 'Tracks whether the user has verified their email address';
