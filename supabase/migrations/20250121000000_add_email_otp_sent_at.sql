-- Add email_otp_sent_at column to profiles table
-- This column tracks when the last OTP email was sent for rate limiting

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'email_otp_sent_at'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN email_otp_sent_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Add comment to the column
COMMENT ON COLUMN public.profiles.email_otp_sent_at IS 'Timestamp when the last email OTP was sent, used for rate limiting';

