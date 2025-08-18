-- Apply nested replies support (Fixed version)
-- Run this script in your Supabase SQL editor
-- This version handles existing constraints gracefully

-- Add parent_reply_id column to comment_replies table (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comment_replies' 
        AND column_name = 'parent_reply_id'
    ) THEN
        ALTER TABLE comment_replies 
        ADD COLUMN parent_reply_id UUID REFERENCES comment_replies(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create index for better performance on nested reply queries (if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_comment_replies_parent_reply_id 
ON comment_replies(parent_reply_id);

-- Drop existing constraint if it exists, then recreate it
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_single_parent' 
        AND table_name = 'comment_replies'
    ) THEN
        ALTER TABLE comment_replies DROP CONSTRAINT check_single_parent;
    END IF;
END $$;

-- Add constraint to ensure only one parent is set
ALTER TABLE comment_replies 
ADD CONSTRAINT check_single_parent 
CHECK (
  (parent_comment_id IS NOT NULL AND parent_reply_id IS NULL) OR
  (parent_comment_id IS NULL AND parent_reply_id IS NOT NULL)
);

-- Verify the updated table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'comment_replies'
ORDER BY ordinal_position;

-- Test the constraint by trying to insert invalid data (should fail)
-- INSERT INTO comment_replies (parent_comment_id, parent_reply_id, user_id, content) 
-- VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'test');

-- Show current constraints
SELECT 
  constraint_name,
  constraint_type,
  table_name
FROM information_schema.table_constraints 
WHERE table_name = 'comment_replies';
