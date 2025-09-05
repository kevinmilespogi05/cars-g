-- Apply ticketing system fix directly
-- Run this in Supabase SQL Editor

-- First, check if columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'reports' 
AND column_name IN ('case_number', 'priority_level', 'assigned_group', 'assigned_patroller_name', 'can_cancel')
ORDER BY column_name;

-- Add missing columns if they don't exist
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS case_number TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS priority_level INTEGER DEFAULT 3;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS assigned_group TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS assigned_patroller_name TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS can_cancel BOOLEAN DEFAULT true;

-- Add constraints
DO $$ 
BEGIN
    -- Add priority level check constraint
    BEGIN
        ALTER TABLE public.reports ADD CONSTRAINT reports_priority_level_check CHECK (priority_level >= 1 AND priority_level <= 5);
    EXCEPTION
        WHEN duplicate_object THEN
            -- Constraint already exists, ignore
            NULL;
    END;
    
    -- Add assigned group check constraint
    BEGIN
        ALTER TABLE public.reports ADD CONSTRAINT reports_assigned_group_check CHECK (assigned_group IN ('Engineering Group', 'Field Group', 'Maintenance Group', 'Other'));
    EXCEPTION
        WHEN duplicate_object THEN
            -- Constraint already exists, ignore
            NULL;
    END;
END $$;

-- Create function to generate case numbers
CREATE OR REPLACE FUNCTION generate_case_number()
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    case_num TEXT;
BEGIN
    -- Get the next sequential number
    SELECT COALESCE(MAX(CAST(SUBSTRING(case_number FROM 3) AS INTEGER)), 0) + 1
    INTO next_number
    FROM public.reports
    WHERE case_number ~ '^[0-9]{6}$';
    
    -- Format as 6-digit number with leading zeros
    case_num := LPAD(next_number::TEXT, 6, '0');
    
    RETURN case_num;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate case numbers
CREATE OR REPLACE FUNCTION set_case_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.case_number IS NULL THEN
        NEW.case_number := generate_case_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_set_case_number ON public.reports;
CREATE TRIGGER trigger_set_case_number
    BEFORE INSERT ON public.reports
    FOR EACH ROW
    EXECUTE FUNCTION set_case_number();

-- Update existing reports with case numbers if they don't have them
UPDATE public.reports 
SET case_number = generate_case_number()
WHERE case_number IS NULL;

-- Verify the changes
SELECT 'Ticketing system applied successfully' as status;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'reports' 
AND column_name IN ('case_number', 'priority_level', 'assigned_group', 'assigned_patroller_name', 'can_cancel')
ORDER BY column_name;
