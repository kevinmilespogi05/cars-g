-- Create pending_registrations table for two-step registration process
CREATE TABLE IF NOT EXISTS pending_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  otp VARCHAR(10) NOT NULL,
  otp_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pending_registrations_email ON pending_registrations(email);
CREATE INDEX IF NOT EXISTS idx_pending_registrations_username ON pending_registrations(username);
CREATE INDEX IF NOT EXISTS idx_pending_registrations_otp_expires ON pending_registrations(otp_expires_at);

-- Add RLS policies
ALTER TABLE pending_registrations ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage pending registrations
CREATE POLICY "Service role can manage pending registrations" ON pending_registrations
  FOR ALL USING (auth.role() = 'service_role');

-- Function to clean up expired pending registrations
CREATE OR REPLACE FUNCTION cleanup_expired_pending_registrations()
RETURNS void AS $$
BEGIN
  DELETE FROM pending_registrations 
  WHERE otp_expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to clean up expired registrations (optional)
-- This would need to be set up in your Supabase dashboard or via pg_cron
