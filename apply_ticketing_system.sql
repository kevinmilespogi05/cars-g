-- Apply ticketing system to existing database
-- Run this directly in Supabase SQL Editor

-- Add case_number column for unique ticket identification
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS case_number TEXT;

-- Add priority_level column (1-5 scale, 5 = highest)
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS priority_level INTEGER DEFAULT 3;

-- Add assigned_group column for tracking which group is handling the case
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS assigned_group TEXT;

-- Add assigned_patroller_name column for displaying assigned patroller
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS assigned_patroller_name TEXT;

-- Add can_cancel column to allow ticket cancellation
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS can_cancel BOOLEAN DEFAULT true;

-- Add constraints (with proper error handling)
DO $$ 
BEGIN
    -- Add priority level check constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'reports_priority_level_check' 
        AND table_name = 'reports'
    ) THEN
        ALTER TABLE public.reports ADD CONSTRAINT reports_priority_level_check CHECK (priority_level >= 1 AND priority_level <= 5);
    END IF;
    
    -- Add assigned group check constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'reports_assigned_group_check' 
        AND table_name = 'reports'
    ) THEN
        ALTER TABLE public.reports ADD CONSTRAINT reports_assigned_group_check CHECK (assigned_group IN ('Engineering Group', 'Field Group', 'Maintenance Group', 'Other'));
    END IF;
END $$;

-- Create comments table for report comments/logs
CREATE TABLE IF NOT EXISTS public.report_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    comment_type TEXT DEFAULT 'comment' CHECK (comment_type IN ('comment', 'status_update', 'assignment', 'resolution')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on comments table
ALTER TABLE public.report_comments ENABLE ROW LEVEL SECURITY;

-- Create policies for comments table
DROP POLICY IF EXISTS "Users can view all comments" ON public.report_comments;
CREATE POLICY "Users can view all comments"
    ON public.report_comments FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can create comments" ON public.report_comments;
CREATE POLICY "Users can create comments"
    ON public.report_comments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own comments" ON public.report_comments;
CREATE POLICY "Users can update their own comments"
    ON public.report_comments FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own comments" ON public.report_comments;
CREATE POLICY "Users can delete their own comments"
    ON public.report_comments FOR DELETE
    USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_report_comments_report_id ON public.report_comments(report_id);
CREATE INDEX IF NOT EXISTS idx_report_comments_user_id ON public.report_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_report_comments_created_at ON public.report_comments(created_at);
CREATE INDEX IF NOT EXISTS idx_reports_case_number ON public.reports(case_number);
CREATE INDEX IF NOT EXISTS idx_reports_priority_level ON public.reports(priority_level);
CREATE INDEX IF NOT EXISTS idx_reports_assigned_group ON public.reports(assigned_group);

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

-- Create function to get report with comments
CREATE OR REPLACE FUNCTION get_report_with_comments(report_uuid UUID)
RETURNS TABLE (
    report_data JSONB,
    comments_data JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        to_jsonb(r.*) as report_data,
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', c.id,
                        'comment', c.comment,
                        'comment_type', c.comment_type,
                        'created_at', c.created_at,
                        'user_profile', jsonb_build_object(
                            'username', p.username,
                            'avatar_url', p.avatar_url
                        )
                    )
                )
                FROM public.report_comments c
                LEFT JOIN public.profiles p ON c.user_id = p.id
                WHERE c.report_id = report_uuid
                ORDER BY c.created_at ASC
            ),
            '[]'::jsonb
        ) as comments_data
    FROM public.reports r
    WHERE r.id = report_uuid;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.report_comments TO authenticated;
GRANT EXECUTE ON FUNCTION get_report_with_comments(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_case_number() TO authenticated;

-- Add comment count to reports (computed column via view)
CREATE OR REPLACE VIEW reports_with_comment_count AS
SELECT 
    r.*,
    COALESCE(comment_counts.comment_count, 0) as comment_count
FROM public.reports r
LEFT JOIN (
    SELECT 
        report_id,
        COUNT(*) as comment_count
    FROM public.report_comments
    GROUP BY report_id
) comment_counts ON r.id = comment_counts.report_id;

-- Grant access to the view
GRANT SELECT ON reports_with_comment_count TO authenticated;

-- Verify the changes
SELECT 'Ticketing system applied successfully' as status;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'reports' 
AND column_name IN ('case_number', 'priority_level', 'assigned_group', 'assigned_patroller_name', 'can_cancel')
ORDER BY column_name;
