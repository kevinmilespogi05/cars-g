# Apply Visitor Monitoring Migration

The visitor monitoring system requires a database migration to add the `user_id` column to the `site_visits` table.

## Quick Fix

Run the SQL script in your Supabase SQL Editor:

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Click on "SQL Editor" in the left sidebar
4. Click "New Query"
5. Copy and paste the entire contents of `apply-visitor-migration.sql`
6. Click "Run" (or press Ctrl/Cmd + Enter)

## Alternative: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Make sure you're logged in
supabase login

# Link to your project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Apply the migration
supabase db push
```

Or run the migration file directly:

```bash
supabase db execute -f apply-visitor-migration.sql
```

## What This Migration Does

- Adds `user_id` column to `site_visits` table
- Creates foreign key relationship to `profiles` table
- Adds index for performance
- Updates RLS policies for admin access

## After Running the Migration

1. Restart your server
2. The visitor monitoring features will be fully functional
3. Existing visitors will be marked as anonymous until they log in

## Troubleshooting

If you get an error about the column already existing, that's fine - the migration uses `IF NOT EXISTS` clauses.

If you get permission errors, make sure you're using the service role key or have admin access to your Supabase project.

