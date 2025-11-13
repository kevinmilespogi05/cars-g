# Fix for Report Decline Status Error

## Problem
When trying to decline a report, you get this error:
```
Failed to update report: new row for relation "reports" violates check constraint "reports_status_check"
400 Bad Request
```

## Root Cause
The database constraint on the `reports` table's `status` column doesn't include all the valid statuses that the application uses. The constraint is likely still only allowing:
- 'pending'
- 'in_progress'
- 'resolved'
- 'declined'

But the application also needs:
- 'cancelled'
- 'verifying'
- 'awaiting_verification'

## Solution
You need to update the database constraint to include all valid statuses.

### Option 1: Fix via Supabase Dashboard (Easiest)

1. Go to https://app.supabase.com and log in to your project
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy and paste the entire contents of `EMERGENCY_FIX_DECLINE_STATUS.sql` in the root directory
5. Click "Run" (or Cmd/Ctrl + Enter)
6. Verify the query succeeds
7. Test declining a report - it should now work!

### Option 2: Fix via Supabase CLI (if local setup is available)

1. Ensure you have Supabase CLI installed
2. Run: `supabase db push` (from the project root)
3. This will apply the pending migration `20250316000000_fix_status_constraint_final.sql`

### Option 3: Manual Fix (if automated methods don't work)

Copy this SQL and execute it in Supabase SQL Editor:

```sql
ALTER TABLE public.reports 
DROP CONSTRAINT IF EXISTS reports_status_check;

ALTER TABLE public.reports 
ADD CONSTRAINT reports_status_check 
CHECK (status IN ('pending', 'in_progress', 'resolved', 'declined', 'cancelled', 'verifying', 'awaiting_verification'));
```

## Why This Happened
Migrations sometimes don't apply correctly in Supabase if:
- They encounter data that violates the new constraint
- Network interruption during migration
- The constraint was manually modified after initial setup
- Migration ordering issues

## Testing
After applying the fix:
1. Go to Admin panel > Reports
2. Select any report
3. Try to change its status to "Declined"
4. The change should apply immediately without errors
5. Test with different status transitions to ensure everything works

## Prevention
- Always ensure all migrations have been applied before deploying new code
- Check migration status regularly with `npx supabase migration list`
- Test status transitions in development before production changes
