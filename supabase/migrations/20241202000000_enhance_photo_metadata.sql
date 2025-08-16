-- Enhance photo metadata support
-- This migration adds support for storing additional photo metadata

-- Add photo_metadata table for storing additional photo information
CREATE TABLE IF NOT EXISTS public.photo_metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_url TEXT NOT NULL,
  report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  device_info JSONB, -- Store device information
  location_info JSONB, -- Store location when photo was taken
  photo_quality TEXT, -- Store photo quality/format info
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_photo_metadata_photo_url ON public.photo_metadata(photo_url);
CREATE INDEX IF NOT EXISTS idx_photo_metadata_report_id ON public.photo_metadata(report_id);
CREATE INDEX IF NOT EXISTS idx_photo_metadata_user_id ON public.photo_metadata(user_id);

-- Add RLS policies
ALTER TABLE public.photo_metadata ENABLE ROW LEVEL SECURITY;

-- Users can view photos from reports they have access to
CREATE POLICY "Users can view photo metadata from accessible reports"
ON public.photo_metadata FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.reports r 
    WHERE r.id = photo_metadata.report_id 
    AND (r.user_id = auth.uid() OR r.status = 'resolved')
  )
);

-- Users can insert their own photo metadata
CREATE POLICY "Users can insert their own photo metadata"
ON public.photo_metadata FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own photo metadata
CREATE POLICY "Users can update their own photo metadata"
ON public.photo_metadata FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own photo metadata
CREATE POLICY "Users can delete their own photo metadata"
ON public.photo_metadata FOR DELETE
USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE public.photo_metadata IS 'Stores additional metadata for photos uploaded to reports';
COMMENT ON COLUMN public.photo_metadata.device_info IS 'JSON object containing device information when photo was captured';
COMMENT ON COLUMN public.photo_metadata.location_info IS 'JSON object containing location information when photo was captured';
COMMENT ON COLUMN public.photo_metadata.photo_quality IS 'Information about photo quality, format, and dimensions';
