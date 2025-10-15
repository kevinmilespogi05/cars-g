-- Add ID verification system for user registration
-- This migration adds support for ID image uploads and verification status

-- Add verification status columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected', 'ai_verified')),
ADD COLUMN IF NOT EXISTS id_front_image_url TEXT,
ADD COLUMN IF NOT EXISTS id_back_image_url TEXT,
ADD COLUMN IF NOT EXISTS verification_notes TEXT,
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ai_verification_confidence DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS ai_verification_details JSONB;

-- Create index for verification status queries
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status ON public.profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_profiles_verified_by ON public.profiles(verified_by);

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.verification_status IS 'User verification status: pending, verified, rejected, ai_verified';
COMMENT ON COLUMN public.profiles.id_front_image_url IS 'URL to the front of user ID image';
COMMENT ON COLUMN public.profiles.id_back_image_url IS 'URL to the back of user ID image';
COMMENT ON COLUMN public.profiles.verification_notes IS 'Admin notes about verification decision';
COMMENT ON COLUMN public.profiles.verified_by IS 'Admin user who verified the account';
COMMENT ON COLUMN public.profiles.verified_at IS 'When the account was verified';
COMMENT ON COLUMN public.profiles.ai_verification_confidence IS 'AI confidence score (0-100)';
COMMENT ON COLUMN public.profiles.ai_verification_details IS 'AI verification analysis details';

-- Create user_verification_requests table for tracking verification requests
CREATE TABLE IF NOT EXISTS public.user_verification_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    id_front_image_url TEXT NOT NULL,
    id_back_image_url TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'ai_processing')),
    admin_notes TEXT,
    ai_analysis JSONB,
    ai_confidence DECIMAL(5,2),
    processed_by UUID REFERENCES public.profiles(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for verification requests
CREATE INDEX IF NOT EXISTS idx_verification_requests_user_id ON public.user_verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON public.user_verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_verification_requests_created_at ON public.user_verification_requests(created_at);

-- Enable RLS for verification requests
ALTER TABLE public.user_verification_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for verification requests
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own verification requests" ON public.user_verification_requests;
DROP POLICY IF EXISTS "Admins can view all verification requests" ON public.user_verification_requests;
DROP POLICY IF EXISTS "Admins can update verification requests" ON public.user_verification_requests;

CREATE POLICY "Users can view their own verification requests" ON public.user_verification_requests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all verification requests" ON public.user_verification_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update verification requests" ON public.user_verification_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create function to automatically create verification request when user uploads ID images
CREATE OR REPLACE FUNCTION create_verification_request()
RETURNS TRIGGER AS $$
DECLARE
    request_id UUID;
BEGIN
    -- Only create verification request if both ID images are provided and status is pending
    -- For INSERT: OLD is NULL, so we check if this is a new record with ID images
    -- For UPDATE: OLD exists, so we check if ID images were just added
    IF NEW.id_front_image_url IS NOT NULL 
       AND NEW.id_back_image_url IS NOT NULL 
       AND NEW.verification_status = 'pending' 
       AND (OLD IS NULL OR OLD.id_front_image_url IS NULL OR OLD.id_back_image_url IS NULL) THEN
        
        INSERT INTO public.user_verification_requests (
            user_id,
            id_front_image_url,
            id_back_image_url,
            status
        ) VALUES (
            NEW.id,
            NEW.id_front_image_url,
            NEW.id_back_image_url,
            'pending'
        ) RETURNING id INTO request_id;
        
        -- Trigger AI verification (this would be handled by the application layer)
        -- For now, we'll just log that a new request was created
        RAISE NOTICE 'New verification request created with ID: %', request_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic verification request creation
DROP TRIGGER IF EXISTS trigger_create_verification_request ON public.profiles;
CREATE TRIGGER trigger_create_verification_request
    AFTER INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_verification_request();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.user_verification_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_verification_requests TO service_role;

-- Create storage bucket for ID verification images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'id-verification',
  'id-verification',
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create storage policies for ID verification bucket
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own ID images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own ID images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all ID images" ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage all ID images" ON storage.objects;

CREATE POLICY "Users can upload their own ID images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'id-verification' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own ID images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'id-verification' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins can view all ID images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'id-verification' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Service role can manage all ID images" ON storage.objects
  FOR ALL USING (bucket_id = 'id-verification');
