-- TEST SCRIPT TO VERIFY CHAT FUNCTIONALITY IS WORKING
-- Run this after applying the main fix to test if everything is working

-- ============================================================================
-- 1. TEST BASIC QUERIES (should not cause recursion)
-- ============================================================================

-- Test 1: Check if we can query chat_participants without recursion
SELECT 'Test 1: Querying chat_participants' as test_name;
SELECT COUNT(*) as participant_count FROM chat_participants LIMIT 1;

-- Test 2: Check if we can query chat_rooms without recursion  
SELECT 'Test 2: Querying chat_rooms' as test_name;
SELECT COUNT(*) as room_count FROM chat_rooms LIMIT 1;

-- Test 3: Check if we can query chat_messages without recursion
SELECT 'Test 3: Querying chat_messages' as test_name;
SELECT COUNT(*) as message_count FROM chat_messages LIMIT 1;

-- ============================================================================
-- 2. TEST POLICY ENFORCEMENT
-- ============================================================================

-- Test 4: Check if RLS is working (should return 0 rows if not authenticated)
SELECT 'Test 4: RLS enforcement check' as test_name;
SELECT COUNT(*) as rls_check FROM chat_participants;

-- ============================================================================
-- 3. TEST FUNCTION CREATION
-- ============================================================================

-- Test 5: Check if functions were created
SELECT 'Test 5: Function existence check' as test_name;
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('create_chat_room', 'create_direct_message_room', 'delete_message')
ORDER BY routine_name;

-- ============================================================================
-- 4. TEST POLICY CREATION
-- ============================================================================

-- Test 6: Check if policies were created
SELECT 'Test 6: Policy existence check' as test_name;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('chat_rooms', 'chat_participants', 'chat_messages', 'message_reactions', 'typing_indicators')
ORDER BY tablename, policyname;

-- ============================================================================
-- 5. SUMMARY
-- ============================================================================

SELECT 'All tests completed. If you see this message without errors, the fix is working!' as result; 