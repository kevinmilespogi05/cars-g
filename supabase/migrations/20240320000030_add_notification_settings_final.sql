-- Add missing notification_settings column to profiles table
-- This migration only adds the missing column without any policy conflicts

-- Add the notification_settings column as JSONB with a default value
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{"chat": true, "push": true, "email": true}'::jsonb;

-- Update existing profiles to have the default notification settings if they don't have any
UPDATE public.profiles 
SET notification_settings = '{"chat": true, "push": true, "email": true}'::jsonb 
WHERE notification_settings IS NULL; 