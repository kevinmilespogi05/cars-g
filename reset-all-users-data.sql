-- ============================================================================
-- RESET ALL USERS DATA SCRIPT
-- This script will:
-- 1. Delete all reports created by users
-- 2. Delete all chat messages
-- 3. Reset all users' points to 0
-- 4. Delete all user achievements
-- ============================================================================

-- WARNING: This is a destructive operation. Make sure you have a backup!

BEGIN;

-- 1. DELETE ALL CHAT MESSAGES
DELETE FROM chat_messages;

-- 2. DELETE ALL REPORTS
DELETE FROM reports;

-- 3. DELETE ALL USER ACHIEVEMENTS
DELETE FROM user_achievements;

-- 4. RESET ALL USERS' POINTS TO 0
UPDATE profiles 
SET 
  points = 0,
  updated_at = NOW()
WHERE role = 'user';

-- COMMIT the transaction
COMMIT;

-- Verification queries (run these to confirm the reset):
-- SELECT COUNT(*) as total_chats FROM chat_messages;
-- SELECT COUNT(*) as total_reports FROM reports;
-- SELECT COUNT(*) as total_achievements FROM user_achievements;
-- SELECT COUNT(*) as users_with_points FROM profiles WHERE points > 0 AND role = 'user';
