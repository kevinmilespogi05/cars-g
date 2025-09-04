-- Add image_url column to announcements table if it doesn't exist
ALTER TABLE public.announcements 
ADD COLUMN IF NOT EXISTS image_url TEXT;
