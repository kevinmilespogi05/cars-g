# Fix Chat Recursion Issue

## Problem
Your chat system is experiencing "infinite recursion detected in policy for relation 'chat_participants'" errors. This happens when Row Level Security (RLS) policies reference themselves in a circular manner, causing 500 Internal Server Errors.

## Root Cause
The current RLS policies in your Supabase database have circular references that cause infinite recursion when querying the `chat_participants` table.

## Solution
You need to run one of the SQL scripts in your Supabase dashboard to fix the RLS policies.

## Step-by-Step Fix

### Option 1: Simple Fix (Recommended)
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to your project
3. Go to **SQL Editor** in the left sidebar
4. Copy and paste the contents of `fix_chat_recursion_simple.sql`
5. Click **Run** to execute the script
6. Verify the policies were created successfully

### Option 2: Comprehensive Fix
1. Follow the same steps as above
2. Use `fix_chat_recursion_remote.sql` instead
3. This provides more detailed policies but is more complex

## What the Script Does

1. **Drops all existing problematic policies** that cause recursion
2. **Creates new, safe policies** that avoid circular references
3. **Uses simple, direct queries** instead of complex nested EXISTS clauses
4. **Maintains security** while fixing the performance issues

## Key Changes

- **Before**: Policies used complex nested EXISTS clauses that could reference themselves
- **After**: Policies use simple IN clauses with subqueries that don't cause recursion
- **Security**: All policies still enforce proper access control
- **Performance**: Queries are now efficient and won't cause infinite loops

## Verification

After running the script, you should see:
- No more 500 errors when loading chat rooms
- Chat functionality working normally
- All policies listed in the verification query at the end of the script

## If Issues Persist

1. Check the Supabase logs for any new error messages
2. Verify that RLS is enabled on all chat tables
3. Ensure the user is properly authenticated
4. Check that the tables exist and have the expected structure

## Tables Affected

- `chat_rooms`
- `chat_participants` 
- `chat_messages`
- `message_reactions`
- `typing_indicators`

## Security Note

These policies maintain the same security model:
- Users can only see rooms they participate in
- Users can only send messages in their rooms
- Users can only modify their own content
- All operations require proper authentication

## Testing

After applying the fix:
1. Try loading the chat list
2. Start a new conversation
3. Send messages
4. Check that all chat features work without errors

The fix should resolve the infinite recursion issue and restore full chat functionality. 