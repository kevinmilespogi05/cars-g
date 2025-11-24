-- Add user_id column to site_visits table to link visitors to authenticated users
ALTER TABLE public.site_visits 
ADD COLUMN IF NOT EXISTS user_id UUID;

-- Add foreign key constraint to profiles table
ALTER TABLE public.site_visits
ADD CONSTRAINT fk_site_visits_user_id 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;

-- Create index on user_id for performance
CREATE INDEX IF NOT EXISTS idx_site_visits_user_id ON public.site_visits(user_id);

-- Update RLS policies to allow admins to view all visitor data
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all visitor data" ON public.site_visits;

-- Create policy for admins to view all visitor data with user information
CREATE POLICY "Admins can view all visitor data"
    ON public.site_visits FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'superadmin')
        )
    );

-- Allow service role to update user_id (for linking visitors to users)
DROP POLICY IF EXISTS "Service role can link visitors to users" ON public.site_visits;

CREATE POLICY "Service role can link visitors to users"
    ON public.site_visits FOR UPDATE
    USING (true)
    WITH CHECK (true);

