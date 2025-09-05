-- Check current reports data
-- Run this in Supabase SQL Editor

-- Check if reports have the new columns and their values
SELECT 
    id,
    title,
    status,
    patrol_user_id,
    case_number,
    priority_level,
    assigned_group,
    assigned_patroller_name,
    can_cancel
FROM public.reports 
ORDER BY created_at DESC 
LIMIT 10;

-- Check if there are any reports with patrol_user_id but no assigned_patroller_name
SELECT 
    id,
    title,
    status,
    patrol_user_id,
    assigned_patroller_name
FROM public.reports 
WHERE patrol_user_id IS NOT NULL 
AND (assigned_patroller_name IS NULL OR assigned_patroller_name = '')
ORDER BY created_at DESC;
