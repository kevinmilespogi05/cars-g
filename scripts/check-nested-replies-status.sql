-- Check the current status of nested replies feature
-- Run this script in your Supabase SQL editor to see what's already implemented

-- Check if parent_reply_id column exists
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'comment_replies'
ORDER BY ordinal_position;

-- Check existing constraints
SELECT 
  constraint_name,
  constraint_type,
  table_name
FROM information_schema.table_constraints 
WHERE table_name = 'comment_replies';

-- Check existing indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'comment_replies';

-- Check if there are any existing nested replies
SELECT 
  COUNT(*) as total_replies,
  COUNT(CASE WHEN parent_comment_id IS NOT NULL THEN 1 END) as replies_to_comments,
  COUNT(CASE WHEN parent_reply_id IS NOT NULL THEN 1 END) as replies_to_replies,
  COUNT(CASE WHEN parent_comment_id IS NULL AND parent_reply_id IS NULL THEN 1 END) as orphaned_replies
FROM comment_replies;
