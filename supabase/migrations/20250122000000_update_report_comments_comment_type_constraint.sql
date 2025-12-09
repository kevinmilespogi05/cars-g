-- Update report_comments comment_type check constraint to include new log types
-- This migration adds support for: priority_update, group_assignment, report_edit, archive, cancellation

-- Drop any existing check constraint on comment_type
DO $$ 
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the constraint name for comment_type check constraint
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.report_comments'::regclass
    AND contype = 'c'
    AND conname LIKE '%comment_type%';
    
    -- Drop the constraint if it exists
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.report_comments DROP CONSTRAINT %I', constraint_name);
    END IF;
END $$;

-- Add the updated check constraint with all comment types
ALTER TABLE public.report_comments 
ADD CONSTRAINT report_comments_comment_type_check 
CHECK (comment_type IN (
    'comment', 
    'status_update', 
    'assignment', 
    'resolution',
    'priority_update',
    'group_assignment',
    'report_edit',
    'archive',
    'cancellation'
));

