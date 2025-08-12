-- Immediate fix for reports table schema
-- Run this in your Supabase SQL Editor

-- Add missing columns to reports table

-- Add images column for multiple image URLs
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- Add priority column
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'));

-- Add location_lat column (alias for latitude)
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS location_lat DECIMAL(10, 8);

-- Add location_lng column (alias for longitude)
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS location_lng DECIMAL(11, 8);

-- Add location_address column (alias for location)
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS location_address TEXT;

-- Add points_awarded column
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS points_awarded INTEGER DEFAULT NULL;

-- Update existing rows to populate the new columns with data from existing columns
UPDATE public.reports 
SET 
    location_lat = latitude,
    location_lng = longitude,
    location_address = location,
    images = CASE 
        WHEN image_url IS NOT NULL AND image_url != '' THEN ARRAY[image_url]
        ELSE '{}'
    END
WHERE (location_lat IS NULL OR location_lng IS NULL OR location_address IS NULL OR images IS NULL);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reports_location_lat ON public.reports(location_lat);
CREATE INDEX IF NOT EXISTS idx_reports_location_lng ON public.reports(location_lng);
CREATE INDEX IF NOT EXISTS idx_reports_priority ON public.reports(priority);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_category ON public.reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id);

-- Verify the table structure
SELECT 'Reports table updated successfully' as status;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'reports'
ORDER BY ordinal_position; 