# How to Fix the Verification Status Constraint

## Step 1: Check Current Constraint
Run this in Supabase SQL Editor to see what the constraint currently allows:

```sql
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'user_verification_requests'::regclass
AND conname = 'user_verification_requests_status_check';
```

## Step 2: Drop the Constraint
Run this to drop the existing constraint:

```sql
ALTER TABLE user_verification_requests 
DROP CONSTRAINT user_verification_requests_status_check CASCADE;
```

## Step 3: Add the New Constraint
Run this to add the constraint with 'declined' included:

```sql
ALTER TABLE user_verification_requests 
ADD CONSTRAINT user_verification_requests_status_check 
CHECK (status IN ('pending', 'approved', 'declined', 'ai_processing'));
```

## Step 4: Verify It Worked
Run this to confirm the constraint now allows 'declined':

```sql
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'user_verification_requests'::regclass
AND conname = 'user_verification_requests_status_check';
```

You should see: `CHECK (status IN ('pending', 'approved', 'declined', 'ai_processing'))`

## Alternative: If the constraint name is different
If Step 1 shows a different constraint name, use this to find all constraints:

```sql
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'user_verification_requests'::regclass
AND contype = 'c';
```

Then drop each one that restricts the status column.

## If Still Not Working
If you're still getting errors after running these steps:

1. Make sure you're running as a user with ALTER TABLE permissions (usually the service role or postgres user)
2. Check if there are any triggers that might be interfering
3. Verify the table name is exactly `user_verification_requests` (case-sensitive in some cases)

To check for triggers:
```sql
SELECT tgname, tgtype, tgenabled 
FROM pg_trigger 
WHERE tgrelid = 'user_verification_requests'::regclass;
```

