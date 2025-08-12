-- Add rank column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS rank TEXT DEFAULT 'Newcomer';

-- Update existing profiles to have a default rank
UPDATE public.profiles 
SET rank = 'Newcomer' 
WHERE rank IS NULL;

-- Make rank column NOT NULL after setting default values
ALTER TABLE public.profiles 
ALTER COLUMN rank SET NOT NULL;

-- Create index for rank column for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_rank ON public.profiles(rank); 