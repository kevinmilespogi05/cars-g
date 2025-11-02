-- Add email verification token columns to profiles table
-- This migration adds support for email verification tokens with expiry

-- Add email verification columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_verification_token TEXT,
ADD COLUMN IF NOT EXISTS email_verification_token_expiry TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS email_otp VARCHAR(6),
ADD COLUMN IF NOT EXISTS email_otp_hash TEXT,
ADD COLUMN IF NOT EXISTS email_otp_expires TIMESTAMP WITH TIME ZONE;

-- Create index for email verification token queries
CREATE INDEX IF NOT EXISTS idx_profiles_email_verification_token ON public.profiles(email_verification_token);
CREATE INDEX IF NOT EXISTS idx_profiles_email_verification_expiry ON public.profiles(email_verification_token_expiry);

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.email_verification_token IS 'Secure token for email verification (15-minute expiry)';
COMMENT ON COLUMN public.profiles.email_verification_token_expiry IS 'Expiry timestamp for email verification token';

-- Update the verification_status enum to include email verification step
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_verification_status_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_verification_status_check 
CHECK (verification_status IN ('pending_email_otp', 'pending_email_verification', 'pending_id_verification', 'pending_admin_approval', 'pending', 'active', 'verified', 'declined', 'ai_verified'));

-- Create function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_email_tokens()
RETURNS void AS $$
BEGIN
    UPDATE public.profiles 
    SET 
        email_verification_token = NULL,
        email_verification_token_expiry = NULL
    WHERE 
        email_verification_token_expiry < NOW()
        AND verification_status = 'pending_email_verification';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up expired tokens (if pg_cron is available)
-- This would run every hour to clean up expired tokens
-- SELECT cron.schedule('cleanup-expired-tokens', '0 * * * *', 'SELECT cleanup_expired_email_tokens();');
