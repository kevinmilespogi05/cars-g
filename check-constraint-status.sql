-- Diagnostic script to check constraint status
-- Run this in Supabase SQL Editor to see what constraints are currently set

-- Check user_verification_requests status constraint
SELECT '=== user_verification_requests STATUS CONSTRAINT ===' as check_type;
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'user_verification_requests'::regclass
AND conname = 'user_verification_requests_status_check';

-- Check what statuses currently exist in the table
SELECT '=== CURRENT STATUSES IN TABLE ===' as check_type;
SELECT status, COUNT(*) as count
FROM user_verification_requests
GROUP BY status
ORDER BY status;

-- Check if 'declined' is in the constraint definition
SELECT '=== CONSTRAINT ALLOWS DECLINED? ===' as check_type;
SELECT 
    CASE 
        WHEN pg_get_constraintdef(oid) LIKE '%declined%' THEN 'YES - declined is allowed'
        ELSE 'NO - declined is NOT allowed'
    END as result,
    pg_get_constraintdef(oid) as constraint_def
FROM pg_constraint
WHERE conrelid = 'user_verification_requests'::regclass
AND conname = 'user_verification_requests_status_check';

-- Check if 'ai_processing' is in the constraint definition
SELECT '=== CONSTRAINT ALLOWS AI_PROCESSING? ===' as check_type;
SELECT 
    CASE 
        WHEN pg_get_constraintdef(oid) LIKE '%ai_processing%' THEN 'YES - ai_processing is allowed (should be removed)'
        ELSE 'NO - ai_processing is NOT allowed (correct)'
    END as result
FROM pg_constraint
WHERE conrelid = 'user_verification_requests'::regclass
AND conname = 'user_verification_requests_status_check';

-- Check profiles verification_status constraint
SELECT '=== profiles VERIFICATION_STATUS CONSTRAINT ===' as check_type;
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'profiles'::regclass
AND conname = 'profiles_verification_status_check';

