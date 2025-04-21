-- Add notification_settings column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{"email": true, "push": true, "chat": true}'::jsonb;

-- Update existing profiles to have default notification settings
UPDATE profiles
SET notification_settings = '{"email": true, "push": true, "chat": true}'::jsonb
WHERE notification_settings IS NULL; 