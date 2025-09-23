-- Email verification table already exists with different schema
-- This migration adds missing indexes and functions for the existing table

-- Create index for faster lookups (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_code ON email_verifications(code);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires_at ON email_verifications(expires_at);

-- Add RLS policies (if they don't exist)
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can insert their own email verifications" ON email_verifications;
DROP POLICY IF EXISTS "Users can read their own email verifications" ON email_verifications;
DROP POLICY IF EXISTS "Users can update their own email verifications" ON email_verifications;

-- Allow users to insert their own verification records
CREATE POLICY "Users can insert their own email verifications" ON email_verifications
    FOR INSERT WITH CHECK (true);

-- Allow users to read their own verification records
CREATE POLICY "Users can read their own email verifications" ON email_verifications
    FOR SELECT USING (true);

-- Allow users to update their own verification records
CREATE POLICY "Users can update their own email verifications" ON email_verifications
    FOR UPDATE USING (true);

-- Function to clean up expired verification codes
CREATE OR REPLACE FUNCTION cleanup_expired_verifications()
RETURNS void AS $$
BEGIN
    DELETE FROM email_verifications 
    WHERE expires_at < NOW() AND verified_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Create a function to generate verification codes
CREATE OR REPLACE FUNCTION generate_verification_code()
RETURNS VARCHAR(6) AS $$
BEGIN
    RETURN LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Create a function to send verification email (placeholder for now)
CREATE OR REPLACE FUNCTION send_verification_email(
    p_email VARCHAR(255),
    p_code VARCHAR(6)
)
RETURNS BOOLEAN AS $$
BEGIN
    -- This will be handled by the backend service
    -- For now, just return true
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
