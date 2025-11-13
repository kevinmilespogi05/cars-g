# Super Admin System Documentation

## Overview

The Cars-G application now supports a **super admin** role with elevated privileges. This document outlines how super admins work, how to create them, and their capabilities.

## Role Hierarchy

The role hierarchy in Cars-G is:

1. **User** — Regular user with no administrative privileges
2. **Patrol** — Enhanced user role for patrol personnel
3. **Admin** — Administrative privileges (manage users, reports, announcements, settings)
4. **Superadmin** — Highest privilege level; can manage admins and superadmins

## Superadmin Capabilities

- ✅ All admin privileges (manage users, reports, announcements, settings)
- ✅ Can promote/demote users to/from **admin** role
- ✅ Can promote/demote users to/from **superadmin** role
- ✅ Can access all admin endpoints and RLS-protected resources
- ✅ Can ban/unban users
- ✅ Can view and manage verification requests
- ✅ Can create and manage announcements

## Creating a Superadmin

### Method 1: Using the Node.js Helper Script (Recommended)

The easiest way to create a superadmin is using the provided script:

```bash
# From the repository root
node create-superadmin.js superadmin@example.com MySecurePassword123 superadmin
```

**Parameters:**
- `email` — Email address for the superadmin account
- `password` — Password (minimum 6 characters)
- `username` (optional) — Username for the superadmin (defaults to email prefix)

**Prerequisites:**
- Node.js installed
- `VITE_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set in `server/.env`

**Example:**
```bash
node create-superadmin.js admin@cars-g.com SecurePass2024! cars_superadmin
```

### Method 2: Manual SQL Insert

If you prefer direct database access:

1. Create the auth user in **Supabase Dashboard** → Auth → Users → Add User
   - Email: `superadmin@example.com`
   - Password: (set your password)
   - Auto Confirm Email: ✓ (checked)

2. Copy the user's UUID and run this SQL in **Supabase SQL Editor**:

```sql
INSERT INTO public.profiles (
  id, 
  email, 
  username, 
  role, 
  points, 
  email_verified, 
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',  -- Replace with the UUID from step 1
  'superadmin@example.com',
  'superadmin',
  'superadmin',
  0,
  true,
  now()
) ON CONFLICT (id) DO NOTHING;
```

3. Restart your server for the changes to take effect.

### Method 3: Using Supabase Admin SDK (Node.js/TypeScript)

For programmatic creation in your application:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Create auth user
const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
  email: 'superadmin@example.com',
  password: 'SecurePassword123',
  email_confirm: true
});

if (authError) throw authError;

// Create profile with superadmin role
const { error: profileError } = await supabaseAdmin
  .from('profiles')
  .insert({
    id: authData.user.id,
    email: 'superadmin@example.com',
    username: 'superadmin',
    role: 'superadmin',
    email_verified: true,
    created_at: new Date().toISOString()
  });

if (profileError) throw profileError;
```

## Database Migration

The migration file `supabase/migrations/20250113000000_add_superadmin_role.sql` handles:

1. **Updates RLS Policies** — All admin-only RLS policies now include `'superadmin'`
   - Settings table
   - Announcements table
   - Points history table
   - Reports table
   - Profiles table (ban status)
   - Achievements tables
   - Chat tables

2. **Seeds Documentation** — Includes commented-out SQL for manual superadmin creation

To apply this migration:

```bash
# Via Supabase CLI
supabase migration up

# Or manually in Supabase SQL Editor
-- Copy and paste the migration file contents
```

## Testing Superadmin Access

### 1. Verify in User Management UI

- Log in as the superadmin
- Navigate to **User Management** (admin dashboard)
- Confirm:
  - ✅ Your role displays as **"superadmin"** (with 👑 emoji)
  - ✅ You see additional buttons to promote/demote superadmins
  - ✅ You can filter by "Super Admins"

### 2. Test API Endpoints

Check that your superadmin can access admin endpoints:

```bash
# Get current user info
curl -H "Authorization: Bearer <ACCESS_TOKEN>" \
  https://your-api.com/api/auth/me

# Should return:
# {
#   "success": true,
#   "user": {
#     "id": "...",
#     "role": "superadmin",
#     ...
#   }
# }

# Get admin verification requests
curl -H "Authorization: Bearer <ACCESS_TOKEN>" \
  https://your-api.com/api/admin/verification-requests
```

### 3. Test Superadmin-Only Actions

- Promote a user to admin: **Click "Admin" button** (should work)
- Promote an admin to superadmin: **Click "Make Superadmin" button** (visible only to superadmins)
- Demote a superadmin: **Click "Demote" button** (visible only to superadmins)

## Backend Implementation Details

### Middleware (`server/middleware/auth.js`)

The `requireRole('admin')` middleware now automatically accepts `'superadmin'`:

```javascript
// This check now passes for both 'admin' AND 'superadmin' users
requireRole('admin')
```

### Role Assignment Endpoint (`server/server.js`)

The `/api/admin/users/:userId/role` endpoint now accepts `'superadmin'`:

```javascript
const allowedRoles = ['user', 'admin', 'patrol', 'superadmin'];
```

**Security Note:** Only superadmins can assign/remove the `'superadmin'` role (enforced in frontend UI).

### Frontend (`src/components/UserManagement.tsx`)

- Added `isAdminLike` helper to treat superadmin like admin in UI
- Superadmin-specific actions are only visible to users with `role === 'superadmin'`
- Superadmins are hidden from non-admin users

## Security Considerations

### ⚠️ Important

- **Superadmin is powerful** — Only grant this role to highly trusted users
- **Limit the number** — Typically you should have 1-2 superadmins
- **Audit access** — Consider logging who accesses what resources
- **Use strong passwords** — Enforce password policies for superadmins
- **Restrict creation** — Only superadmins can create other superadmins

### RLS Policies

All RLS policies have been updated to include `'superadmin'` in `IN ('admin', 'superadmin')` checks. This ensures:

- Superadmins can read/write all admin-protected resources
- Non-admin users cannot see admin data
- The database enforces role-based access control

## Troubleshooting

### "Insufficient permissions" Error

**Problem:** Superadmin can't access admin endpoints

**Solution:**
1. Restart the server
2. Log out and log back in
3. Check that the profile `role` is exactly `'superadmin'` (case-sensitive)
4. Verify the JWT token includes `"role": "superadmin"`

### Superadmin Hidden from User Management

**Problem:** Created a superadmin but don't see them in User Management

**Solution:**
1. Log out and log back in
2. Refresh the page (Ctrl+Shift+R / Cmd+Shift+R)
3. Check the role dropdown — filter by "Super Admins"
4. Verify in the database: `SELECT * FROM profiles WHERE role = 'superadmin';`

### Can't Promote Users to Superadmin

**Problem:** "Make Superadmin" button doesn't appear

**Solution:**
1. Ensure you're logged in as a superadmin (not just admin)
2. Refresh the page to reload the component
3. Check browser console for errors: `F12` → Console tab

## Future Enhancements

Potential improvements to the superadmin system:

- [ ] Audit logging for superadmin actions
- [ ] Separate "Super Admin Management" dashboard
- [ ] Ability to define custom admin roles
- [ ] Email notifications for superadmin actions
- [ ] Time-limited superadmin elevation
- [ ] Multi-factor authentication for superadmin accounts

## Related Documentation

- [User Management Component](../src/components/UserManagement.tsx)
- [Auth Middleware](../server/middleware/auth.js)
- [Auth Routes](../server/server.js) — `/api/admin/*` endpoints
- [RLS Policies](../supabase/migrations/) — Security policies

---

**Last Updated:** November 13, 2025  
**Version:** 1.0  
**Status:** Stable
