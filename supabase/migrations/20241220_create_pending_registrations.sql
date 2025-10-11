-- Create pending_registrations table for OTP verification
CREATE TABLE IF NOT EXISTS pending_registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL,
    password_hash TEXT NOT NULL,
    first_name VARCHAR(100) DEFAULT '',
    last_name VARCHAR(100) DEFAULT '',
    phone VARCHAR(20) DEFAULT NULL,
    code VARCHAR(10) NOT NULL, -- OTP code
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pending_registrations_email ON pending_registrations(email);
CREATE INDEX IF NOT EXISTS idx_pending_registrations_expires_at ON pending_registrations(expires_at);

-- Create function to clean up expired registrations
CREATE OR REPLACE FUNCTION cleanup_expired_registrations()
RETURNS void AS $$
BEGIN
    DELETE FROM pending_registrations 
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pending_registrations_updated_at
    BEFORE UPDATE ON pending_registrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE pending_registrations ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage all records
CREATE POLICY "Service role can manage all pending registrations" ON pending_registrations
    FOR ALL USING (auth.role() = 'service_role');

-- Allow users to read their own pending registration
CREATE POLICY "Users can read their own pending registration" ON pending_registrations
    FOR SELECT USING (email = auth.jwt() ->> 'email');

-- Add comments for documentation
COMMENT ON TABLE pending_registrations IS 'Stores pending user registrations with OTP verification codes';
COMMENT ON COLUMN pending_registrations.email IS 'User email address (unique)';
COMMENT ON COLUMN pending_registrations.username IS 'Desired username';
COMMENT ON COLUMN pending_registrations.password_hash IS 'Hashed password (will be used to create user)';
COMMENT ON COLUMN pending_registrations.code IS 'OTP verification code';
COMMENT ON COLUMN pending_registrations.expires_at IS 'When the OTP code expires (typically 10 minutes)';
