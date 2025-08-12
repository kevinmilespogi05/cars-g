-- Comprehensive fix for reports table schema
-- This migration ensures all required columns exist with proper structure

-- First, let's check what currently exists and add missing columns
DO $$ 
BEGIN
    -- Add missing columns if they don't exist
    
    -- Add images column for multiple image URLs
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'reports' 
        AND column_name = 'images'
    ) THEN
        ALTER TABLE public.reports ADD COLUMN images TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Added images column to reports table';
    END IF;
    
    -- Add priority column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'reports' 
        AND column_name = 'priority'
    ) THEN
        ALTER TABLE public.reports ADD COLUMN priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'));
        RAISE NOTICE 'Added priority column to reports table';
    END IF;
    
    -- Add location_lat column (alias for latitude)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'reports' 
        AND column_name = 'location_lat'
    ) THEN
        ALTER TABLE public.reports ADD COLUMN location_lat DECIMAL(10, 8);
        RAISE NOTICE 'Added location_lat column to reports table';
    END IF;
    
    -- Add location_lng column (alias for longitude)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'reports' 
        AND column_name = 'location_lng'
    ) THEN
        ALTER TABLE public.reports ADD COLUMN location_lng DECIMAL(11, 8);
        RAISE NOTICE 'Added location_lng column to reports table';
    END IF;
    
    -- Add location_address column (alias for location)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'reports' 
        AND column_name = 'location_address'
    ) THEN
        ALTER TABLE public.reports ADD COLUMN location_address TEXT;
        RAISE NOTICE 'Added location_address column to reports table';
    END IF;
    
    -- Add points_awarded column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'reports' 
        AND column_name = 'points_awarded'
    ) THEN
        ALTER TABLE public.reports ADD COLUMN points_awarded INTEGER DEFAULT NULL;
        RAISE NOTICE 'Added points_awarded column to reports table';
    END IF;
    
END $$;

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

-- Create indexes for better performance on new columns
CREATE INDEX IF NOT EXISTS idx_reports_location_lat ON public.reports(location_lat);
CREATE INDEX IF NOT EXISTS idx_reports_location_lng ON public.reports(location_lng);
CREATE INDEX IF NOT EXISTS idx_reports_priority ON public.reports(priority);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_category ON public.reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id);

-- Add comments for documentation
COMMENT ON COLUMN public.reports.images IS 'Array of image URLs for the report';
COMMENT ON COLUMN public.reports.priority IS 'Priority level of the report (low, medium, high)';
COMMENT ON COLUMN public.reports.location_lat IS 'Latitude coordinate of the report location';
COMMENT ON COLUMN public.reports.location_lng IS 'Longitude coordinate of the report location';
COMMENT ON COLUMN public.reports.location_address IS 'Human-readable address of the report location';
COMMENT ON COLUMN public.reports.points_awarded IS 'Points awarded for this report';

-- Verify the table structure
DO $$
DECLARE
    expected_columns text[] := ARRAY[
        'id', 'user_id', 'title', 'description', 'category', 'location', 'latitude', 'longitude',
        'status', 'image_url', 'video_url', 'created_at', 'updated_at', 'images', 'priority',
        'location_lat', 'location_lng', 'location_address', 'points_awarded'
    ];
    actual_columns text[];
    missing_columns text[];
BEGIN
    -- Get actual columns
    SELECT array_agg(column_name::text ORDER BY ordinal_position)
    INTO actual_columns
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'reports';
    
    -- Find missing columns
    SELECT array_agg(col)
    INTO missing_columns
    FROM unnest(expected_columns) AS col
    WHERE col != ALL(actual_columns);
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE EXCEPTION 'Missing columns in reports table: %', missing_columns;
    ELSE
        RAISE NOTICE 'Reports table schema updated successfully with all required columns';
    END IF;
END $$; 