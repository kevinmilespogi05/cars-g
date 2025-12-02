# Professional Admin Role-Based Access Control (RBAC) System

## Overview

Cars-G now implements an enterprise-grade, role-based access control (RBAC) system with fine-grained permissions, audit logging, and comprehensive security measures. This replaces the simple superadmin role with a professional permission management framework.

## System Architecture

```
User (profiles.role = 'superadmin', 'admin', 'patrol', 'user')
    ↓
Admin Users (admin_users table)
    ↓
Admin Roles (admin_roles table)
    ↓
Permissions (permissions table)
    ↓
Audit Logs (audit_logs table)
```

## Role Hierarchy

| Hierarchy | Role | Title | Permissions | Can Create/Manage |
|-----------|------|-------|-------------|------------------|
| 100 | `superadmin` | Super Administrator | All system permissions | All admins, roles, permissions |
| 50 | `admin` | Administrator | All except admin management & security | Users, reports, announcements, settings |
| 25 | `moderator` | Moderator | Limited moderation & viewing | N/A (view-only except banning) |
| 0 | `user` | Regular User | Personal data only | N/A |

## Core Concepts

### 1. Permissions

**Format:** `category.action` (e.g., `user.ban`, `admin.create`)

**Categories:**
- **User Management** — User CRUD and role assignment
- **Admin Management** — Admin account management (superadmin only)
- **Report Management** — Report handling and assignment
- **Settings** — System configuration
- **Announcements** — Announcement management
- **Security** — Audit logs, MFA, session management

**Sample Permissions:**
```
user.create, user.read, user.update, user.delete, user.ban, user.role_assign
admin.create, admin.read, admin.update, admin.delete, admin.role_manage
report.read, report.update, report.delete, report.assign
audit.read, audit.export, security.mfa, security.session
```

### 2. Roles

Predefined system roles with bundled permissions:

- **Superadmin** — All permissions, can manage other admins
- **Admin** — Standard admin capabilities, cannot manage other admins
- **Moderator** — Limited to viewing and moderate actions (ban users, view reports)

#### Reports & analytics exports

- Admins can export report data (PDF or CSV) from the admin reports dashboard.
- Exports respect the currently selected filters (status, date range) and are intended for auditing and city reporting.

### 3. Admin Users

The `admin_users` table tracks which users have admin privileges and their assigned role.

```sql
SELECT 
    au.id, 
    au.admin_role_id,
    ar.name as role_name,
    au.created_by,
    au.is_active,
    au.last_login
FROM admin_users au
JOIN admin_roles ar ON au.admin_role_id = ar.id;
```

### 4. Audit Logs

All admin actions are logged for compliance and security.

```sql
SELECT 
    admin_user_id,
    action,
    resource_type,
    resource_id,
    status,
    created_at
FROM audit_logs
ORDER BY created_at DESC;
```

## Implementation Guide

### Creating an Admin User

**Via Script (Recommended):**
```bash
node create-superadmin.js admin@example.com password username
```

**Via SQL (Direct):**
```sql
-- First, create auth user via Supabase Dashboard
-- Then insert admin_users record
INSERT INTO admin_users (
    id,
    admin_role_id,
    created_by,
    is_active
)
VALUES (
    '11111111-1111-1111-1111-111111111111',  -- User ID from auth
    '00000000-0000-0000-0000-000000000002',  -- admin role ID
    '99999999-9999-9999-9999-999999999999',  -- Current superadmin ID
    true
);
```

**Via Node.js:**
```javascript
import { createAdminUser } from './server/utils/adminControl.js';

const newAdmin = await createAdminUser(
    supabaseAdmin,
    userId,
    adminRoleId,  // '00000000-0000-0000-0000-000000000002' for admin role
    currentAdminId
);
```

### Checking Permissions in Code

**Backend (Server.js):**
```javascript
import { hasPermission } from './utils/adminControl.js';
import { requirePermission } from './middleware/auth.js';

// Middleware-based check
app.post('/api/admin/users/:userId/role', 
    authenticateToken,
    requirePermission('user.role_assign', supabaseAdmin),
    async (req, res) => {
        // Handler
    }
);

// Manual check
const canBan = await hasPermission(supabaseAdmin, userId, 'user.ban');
if (!canBan) {
    return res.status(403).json({ error: 'Insufficient permissions' });
}
```

**Frontend (React):**
```javascript
import { useAuthStore } from './store/authStore';

export function AdminPanel() {
    const { user } = useAuthStore();
    
    // Simple role check (existing)
    if (user?.role !== 'admin' && user?.role !== 'superadmin') {
        return <Unauthorized />;
    }
    
    // Show superadmin-only features
    {user?.role === 'superadmin' && (
        <AdminManagementSection />
    )}
}
```

### Logging Admin Actions

```javascript
import { logAdminAction } from './utils/adminControl.js';

// Log user ban
await logAdminAction(
    supabaseAdmin,
    adminUserId,
    'ban_user',
    'users',
    bannedUserId,
    { reason: 'Spam', duration: '7 days' },
    'success'
);

// Log failed permission attempt
await logAdminAction(
    supabaseAdmin,
    adminUserId,
    'attempted_admin_create',
    'admins',
    targetUserId,
    null,
    'failure',
    'Insufficient permissions: admin.create required'
);
```

### Querying Audit Logs

```javascript
import { getAuditLogs } from './utils/adminControl.js';

// Get all logs for a user
const { logs, total } = await getAuditLogs(supabaseAdmin, {
    adminUserId: userId,
    limit: 50,
    offset: 0
});

// Get logs for specific resource
const { logs } = await getAuditLogs(supabaseAdmin, {
    resourceType: 'users',
    action: 'ban_user'
});

// Get failed operations
const { logs } = await getAuditLogs(supabaseAdmin, {
    status: 'failure'
});
```

## Security Features

### 1. Permission-Based Access Control

Instead of checking just roles, sensitive endpoints should check specific permissions:

```javascript
// Old approach (fragile)
if (user.role !== 'admin') throw Error('Not admin');

// New approach (flexible & auditable)
const canCreate = await hasPermission(supabaseAdmin, user.id, 'user.create');
if (!canCreate) throw Error('Missing user.create permission');
```

### 2. Audit Trail

Every admin action is logged:
- **Who** performed the action (admin_user_id)
- **What** action was taken (action, resource_type)
- **Which** resource was affected (resource_id)
- **When** it happened (created_at)
- **Result** (status: success/failure)
- **Why** (details JSON, error_message)

### 3. Role Hierarchy Enforcement

```javascript
// Only superadmin can manage other admins
if (!isSuperAdmin(supabaseAdmin, userId)) {
    return res.status(403).json({ error: 'Superadmin only' });
}
```

### 4. Session Tracking

The `admin_sessions` table tracks active admin sessions:
```sql
SELECT * FROM admin_sessions 
WHERE admin_user_id = userId 
AND expires_at > NOW();
```

## Database Tables Reference

### admin_roles
```sql
CREATE TABLE admin_roles (
    id UUID PRIMARY KEY,
    name TEXT UNIQUE,           -- 'superadmin', 'admin', 'moderator'
    title TEXT,                 -- 'Super Administrator'
    description TEXT,
    hierarchy_level INT,        -- 100, 50, 25
    is_system_role BOOLEAN,     -- true for built-in roles
    is_active BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### permissions
```sql
CREATE TABLE permissions (
    id UUID PRIMARY KEY,
    code TEXT UNIQUE,           -- 'user.ban', 'admin.create'
    name TEXT,                  -- 'Ban Users'
    description TEXT,
    category TEXT,              -- 'User Management'
    resource TEXT,              -- 'users'
    action TEXT,                -- 'ban'
    created_at TIMESTAMP
);
```

### admin_users
```sql
CREATE TABLE admin_users (
    id UUID PRIMARY KEY,        -- References profiles.id
    admin_role_id UUID,         -- Role assignment
    created_by UUID,            -- Who created this admin
    is_active BOOLEAN,
    last_login TIMESTAMP,
    mfa_enabled BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### audit_logs
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    admin_user_id UUID,         -- Who did it
    action TEXT,                -- What action
    resource_type TEXT,         -- What resource type
    resource_id TEXT,           -- Which resource
    details JSONB,              -- Additional context
    status TEXT,                -- 'success' or 'failure'
    error_message TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP
);
```

### admin_sessions
```sql
CREATE TABLE admin_sessions (
    id UUID PRIMARY KEY,
    admin_user_id UUID,
    token_hash TEXT UNIQUE,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP,
    last_activity TIMESTAMP,
    created_at TIMESTAMP
);
```

## Migration Steps

1. **Apply database migration:**
   ```bash
   # In Supabase SQL Editor, run:
   # supabase/migrations/20250113000002_professional_rbac_system.sql
   ```

2. **Create initial superadmin:**
   ```bash
   node create-superadmin.js admin@example.com password123 admin
   ```

3. **Restart server** to load new utilities

4. **Update API endpoints** to use `requirePermission` middleware

5. **Monitor audit logs** for any access issues

## Best Practices

✅ **Do:**
- Always log admin actions
- Use permission codes instead of role checks for sensitive operations
- Regularly audit the audit_logs table
- Limit superadmin count to 1-2 trusted users
- Rotate admin credentials periodically
- Enable MFA for admin accounts
- Review audit logs weekly

❌ **Don't:**
- Hardcode role checks (use permission system instead)
- Create unlimited admin accounts
- Share admin credentials
- Ignore audit logs
- Use simple passwords for admin accounts
- Grant admin access via bulk SQL updates

## Future Enhancements

- [ ] Multi-factor authentication (MFA) for admins
- [ ] Time-limited admin elevation
- [ ] Approval workflow for sensitive actions
- [ ] Real-time audit log dashboard
- [ ] Admin activity alerts
- [ ] Custom role creation via UI
- [ ] Permission templates
- [ ] API keys for service accounts
- [ ] IP whitelist enforcement

## Support & Troubleshooting

**Issue:** Admin created but can't access endpoints
**Solution:** 
1. Verify `admin_users` record exists
2. Check role is active: `SELECT is_active FROM admin_roles...`
3. Verify permissions assigned: `SELECT * FROM role_permissions...`
4. Check audit logs for errors

**Issue:** Permission check always fails
**Solution:**
1. Verify `has_permission()` RPC function exists
2. Check permission code matches exactly
3. Ensure admin_users.is_active = true
4. Review audit logs

**Issue:** Audit logs not being created
**Solution:**
1. Verify `log_admin_action()` RPC function exists
2. Check table permissions: `SELECT policies FROM information_schema...`
3. Ensure calling with correct parameters

---

**Version:** 2.0 (Professional RBAC)  
**Last Updated:** November 13, 2025  
**Status:** Production Ready
