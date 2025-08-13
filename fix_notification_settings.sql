-- Fix: Add missing notification_settings column to profiles table
-- Run this directly in your Supabase SQL editor

-- Add the notification_settings column as JSONB with a default value
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{"push": true, "email": true}'::jsonb;

-- Update existing profiles to have the default notification settings if they don't have any
UPDATE public.profiles 
SET notification_settings = '{"push": true, "email": true}'::jsonb 
WHERE notification_settings IS NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'notification_settings'; 