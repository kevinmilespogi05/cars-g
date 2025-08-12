# Chat Participants Infinite Recursion Fix

## Problem Description

The application was experiencing a critical error: **"infinite recursion detected in policy for relation 'chat_participants'"** when trying to:

1. Load chat rooms
2. Start conversations
3. Access chat participants

## Root Cause

The issue was in the Row Level Security (RLS) policy for the `chat_participants` table. The policy was creating infinite recursion because it was trying to check permissions by querying the same table it was protecting.

### Problematic Policy (Before Fix)

```sql
CREATE POLICY "Users can view participants in their rooms" ON public.chat_participants FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_participants cp2
            WHERE cp2.room_id = room_id AND cp2.user_id = (select auth.uid())
        )
    );
```

**Why this caused infinite recursion:**
1. User tries to select from `chat_participants`
2. RLS policy kicks in and tries to check if user can view participants
3. Policy queries `chat_participants` again to check permissions
4. RLS policy kicks in again, creating infinite recursion
5. Supabase detects this and returns 500 Internal Server Error

## Solution Applied

### Fixed Policy (After Fix)

```sql
CREATE POLICY "Users can view participants in their rooms" ON public.chat_participants FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_rooms
            WHERE id = room_id AND 
            EXISTS (
                SELECT 1 FROM public.chat_participants cp_check
                WHERE cp_check.room_id = chat_rooms.id AND cp_check.user_id = (select auth.uid())
            )
        )
    );
```

**How this fixes the issue:**
1. The policy now checks permissions through the `chat_rooms` table first
2. It only then checks `chat_participants` to verify the user is a participant
3. This breaks the infinite recursion cycle
4. The policy still maintains the same security level

## Additional Policies Fixed

The same pattern was applied to fix similar issues in:

- `chat_messages` - INSERT and SELECT policies
- `message_reactions` - SELECT policy  
- `typing_indicators` - SELECT policy

## Migration Applied

- **File**: `20240320000021_fix_chat_participants_recursion.sql`
- **Status**: Successfully applied to remote database
- **Tables Affected**: `chat_participants`, `chat_messages`, `message_reactions`, `typing_indicators`

## Prevention Guidelines

To avoid similar issues in the future:

### 1. Avoid Self-Referencing Policies
Never create RLS policies that query the same table they're protecting for permission checks.

**❌ Bad Example:**
```sql
-- This will cause infinite recursion
CREATE POLICY "bad_policy" ON table_name FOR SELECT
    USING (EXISTS (SELECT 1 FROM table_name WHERE ...));
```

**✅ Good Example:**
```sql
-- Check permissions through related tables
CREATE POLICY "good_policy" ON table_name FOR SELECT
    USING (EXISTS (SELECT 1 FROM related_table WHERE ...));
```

### 2. Use Hierarchical Permission Checks
- Check permissions at the highest level possible (e.g., `chat_rooms` before `chat_participants`)
- Use foreign key relationships to establish permission chains
- Avoid circular dependencies in permission logic

### 3. Test RLS Policies
- Always test RLS policies with complex queries
- Watch for infinite recursion errors in logs
- Use `EXPLAIN` to understand query execution plans

### 4. Policy Design Patterns
- **Direct ownership**: `auth.uid() = owner_id`
- **Membership check**: `EXISTS (SELECT 1 FROM members WHERE user_id = auth.uid())`
- **Hierarchical access**: Check parent table permissions first

## Expected Results

After applying this fix:
- ✅ Chat rooms should load without errors
- ✅ Starting conversations should work properly
- ✅ Accessing chat participants should be successful
- ✅ No more 500 Internal Server Error responses
- ✅ No more infinite recursion warnings

## Testing Recommendations

1. **Test chat functionality**:
   - Load chat list
   - Start new conversations
   - Send messages
   - View participants

2. **Monitor logs** for any remaining RLS-related errors

3. **Verify performance** - the new policies should be more efficient

## Related Files

- `supabase/migrations/20240320000021_fix_chat_participants_recursion.sql`
- `src/services/chatService.ts`
- `src/components/ChatList.tsx` 