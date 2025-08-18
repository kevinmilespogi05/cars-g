-- Add support for nested replies (replies to replies)
-- This migration adds a parent_reply_id column to allow replies to replies

-- Add parent_reply_id column to comment_replies table
ALTER TABLE comment_replies 
ADD COLUMN IF NOT EXISTS parent_reply_id UUID REFERENCES comment_replies(id) ON DELETE CASCADE;

-- Create index for better performance on nested reply queries
CREATE INDEX IF NOT EXISTS idx_comment_replies_parent_reply_id 
ON comment_replies(parent_reply_id);

-- Update the comment_replies table structure to support both comment and reply parents
-- Now a reply can be either:
-- 1. A reply to a comment (parent_comment_id is set, parent_reply_id is null)
-- 2. A reply to a reply (parent_reply_id is set, parent_comment_id is null)

-- Add constraint to ensure only one parent is set
ALTER TABLE comment_replies 
ADD CONSTRAINT check_single_parent 
CHECK (
  (parent_comment_id IS NOT NULL AND parent_reply_id IS NULL) OR
  (parent_comment_id IS NULL AND parent_reply_id IS NOT NULL)
);

-- Update RLS policies to handle nested replies
-- The existing policies should work, but let's make sure they're comprehensive

-- Verify the updated table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'comment_replies'
ORDER BY ordinal_position;
