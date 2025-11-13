-- Migration: Professional Superadmin Role System with RBAC
-- Description: Implements fine-grained role-based access control (RBAC), audit logging,
--              and permission management for enterprise-grade admin system

-- ============================================================================
-- PART 1: Role Definitions and Permissions Tables
-- ============================================================================

-- Create admin_roles table (role definitions)
CREATE TABLE IF NOT EXISTS public.admin_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    hierarchy_level INT NOT NULL DEFAULT 0,
    is_system_role BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create permissions table (what actions can be performed)
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    resource TEXT NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_role_id UUID NOT NULL REFERENCES public.admin_roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(admin_role_id, permission_id)
);

-- Create admin_users table (users with admin privileges)
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    admin_role_id UUID NOT NULL REFERENCES public.admin_roles(id) ON DELETE RESTRICT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    mfa_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create audit_logs table (tracks all admin actions)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details JSONB,
    status TEXT NOT NULL DEFAULT 'success',
    error_message TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin_sessions table (track active sessions)
CREATE TABLE IF NOT EXISTS public.admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PART 2: Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_admin_users_role_id ON public.admin_users(admin_role_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_is_active ON public.admin_users(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_users_created_by ON public.admin_users(created_by);
CREATE INDEX IF NOT EXISTS idx_role_permissions_admin_role_id ON public.role_permissions(admin_role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON public.role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_user_id ON public.audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON public.audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_user_id ON public.admin_sessions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON public.admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON public.permissions(category);

-- ============================================================================
-- PART 3: Enable RLS on New Tables
-- ============================================================================

ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 4: RLS Policies for Admin Roles (readable by all users, managed by superadmin)
-- ============================================================================

CREATE POLICY "Anyone can read admin roles" ON public.admin_roles
    FOR SELECT USING (true);

CREATE POLICY "Only superadmin can manage admin roles" ON public.admin_roles
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role = 'superadmin'
        )
    ) WITH CHECK (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role = 'superadmin'
        )
    );

-- ============================================================================
-- PART 5: RLS Policies for Permissions (readable by admins, managed by superadmin)
-- ============================================================================

CREATE POLICY "Admins can read permissions" ON public.permissions
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM public.admin_users WHERE is_active = true
        )
        OR
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role IN ('admin', 'superadmin')
        )
    );

CREATE POLICY "Only superadmin can manage permissions" ON public.permissions
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role = 'superadmin'
        )
    ) WITH CHECK (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role = 'superadmin'
        )
    );

-- ============================================================================
-- PART 6: RLS Policies for Admin Users
-- ============================================================================

CREATE POLICY "Superadmin can manage all admin users" ON public.admin_users
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role = 'superadmin'
        )
    ) WITH CHECK (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role = 'superadmin'
        )
    );

CREATE POLICY "Admins can view their own data" ON public.admin_users
    FOR SELECT USING (
        auth.uid() = id
    );

-- ============================================================================
-- PART 7: RLS Policies for Audit Logs
-- ============================================================================

CREATE POLICY "Superadmin can view all audit logs" ON public.audit_logs
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role = 'superadmin'
        )
    );

CREATE POLICY "Admins can view their own audit logs" ON public.audit_logs
    FOR SELECT USING (
        auth.uid() = admin_user_id AND
        auth.uid() IN (
            SELECT id FROM public.admin_users WHERE is_active = true
        )
    );

CREATE POLICY "Any admin can insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT id FROM public.admin_users WHERE is_active = true
        )
        OR
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role IN ('admin', 'superadmin')
        )
    );

-- ============================================================================
-- PART 8: RLS Policies for Admin Sessions
-- ============================================================================

CREATE POLICY "Superadmin can manage all sessions" ON public.admin_sessions
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role = 'superadmin'
        )
    ) WITH CHECK (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role = 'superadmin'
        )
    );

CREATE POLICY "Users can manage their own sessions" ON public.admin_sessions
    FOR ALL USING (
        auth.uid() = admin_user_id
    ) WITH CHECK (
        auth.uid() = admin_user_id
    );

-- ============================================================================
-- PART 9: Seed Default Roles and Permissions
-- ============================================================================

-- Insert default roles
INSERT INTO public.admin_roles (id, name, title, description, hierarchy_level, is_system_role, is_active)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'superadmin', 'Super Administrator', 'Full system access with all permissions', 100, true, true),
    ('00000000-0000-0000-0000-000000000002', 'admin', 'Administrator', 'Standard administrative access', 50, true, true),
    ('00000000-0000-0000-0000-000000000003', 'moderator', 'Moderator', 'Content and user moderation', 25, true, true)
ON CONFLICT (name) DO NOTHING;

-- Insert core permissions
INSERT INTO public.permissions (code, name, description, category, resource, action)
VALUES 
    -- User Management
    ('user.create', 'Create Users', 'Create new user accounts', 'User Management', 'users', 'create'),
    ('user.read', 'View Users', 'View user profiles and information', 'User Management', 'users', 'read'),
    ('user.update', 'Update Users', 'Modify user information', 'User Management', 'users', 'update'),
    ('user.delete', 'Delete Users', 'Delete user accounts', 'User Management', 'users', 'delete'),
    ('user.ban', 'Ban Users', 'Ban users from the system', 'User Management', 'users', 'ban'),
    ('user.role_assign', 'Assign Roles', 'Assign roles to users', 'User Management', 'users', 'role_assign'),
    
    -- Admin Management (superadmin only)
    ('admin.create', 'Create Admins', 'Create admin accounts', 'Admin Management', 'admins', 'create'),
    ('admin.read', 'View Admins', 'View admin user accounts', 'Admin Management', 'admins', 'read'),
    ('admin.update', 'Update Admins', 'Modify admin information', 'Admin Management', 'admins', 'update'),
    ('admin.delete', 'Delete Admins', 'Remove admin privileges', 'Admin Management', 'admins', 'delete'),
    ('admin.role_manage', 'Manage Admin Roles', 'Create and modify admin roles', 'Admin Management', 'admin_roles', 'manage'),
    
    -- Report Management
    ('report.read', 'View Reports', 'View system reports', 'Report Management', 'reports', 'read'),
    ('report.update', 'Update Reports', 'Modify reports', 'Report Management', 'reports', 'update'),
    ('report.delete', 'Delete Reports', 'Delete reports', 'Report Management', 'reports', 'delete'),
    ('report.assign', 'Assign Reports', 'Assign reports to patrol', 'Report Management', 'reports', 'assign'),
    
    -- Settings Management
    ('settings.read', 'View Settings', 'View system settings', 'Settings', 'settings', 'read'),
    ('settings.update', 'Update Settings', 'Modify system settings', 'Settings', 'settings', 'update'),
    
    -- Announcements
    ('announcement.create', 'Create Announcements', 'Create system announcements', 'Announcements', 'announcements', 'create'),
    ('announcement.read', 'View Announcements', 'View announcements', 'Announcements', 'announcements', 'read'),
    ('announcement.update', 'Update Announcements', 'Modify announcements', 'Announcements', 'announcements', 'update'),
    ('announcement.delete', 'Delete Announcements', 'Delete announcements', 'Announcements', 'announcements', 'delete'),
    
    -- Audit & Security
    ('audit.read', 'View Audit Logs', 'View system audit logs', 'Security', 'audit', 'read'),
    ('audit.export', 'Export Audit Logs', 'Export audit log data', 'Security', 'audit', 'export'),
    ('security.mfa', 'Manage MFA', 'Enable/disable multi-factor authentication', 'Security', 'security', 'mfa'),
    ('security.session', 'Manage Sessions', 'View and revoke admin sessions', 'Security', 'security', 'session')
ON CONFLICT (code) DO NOTHING;

-- Assign all permissions to superadmin role
INSERT INTO public.role_permissions (admin_role_id, permission_id)
SELECT 
    '00000000-0000-0000-0000-000000000001',
    id
FROM public.permissions
ON CONFLICT (admin_role_id, permission_id) DO NOTHING;

-- Assign standard permissions to admin role (exclude admin management, security, and role assignment)
INSERT INTO public.role_permissions (admin_role_id, permission_id)
SELECT 
        '00000000-0000-0000-0000-000000000002',
        id
FROM public.permissions
WHERE category NOT IN ('Admin Management', 'Security')
    AND code != 'user.role_assign'
ON CONFLICT (admin_role_id, permission_id) DO NOTHING;

-- Assign moderation permissions to moderator role
INSERT INTO public.role_permissions (admin_role_id, permission_id)
SELECT 
    '00000000-0000-0000-0000-000000000003',
    id
FROM public.permissions
WHERE code IN (
    'user.read', 'user.ban', 'report.read', 'report.update',
    'announcement.read', 'audit.read'
)
ON CONFLICT (admin_role_id, permission_id) DO NOTHING;

-- ============================================================================
-- PART 10: Helper Functions for Permission Checking
-- ============================================================================

-- Function to check if admin has a specific permission
CREATE OR REPLACE FUNCTION public.has_permission(p_admin_user_id UUID, p_permission_code TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.admin_users au
        JOIN public.admin_roles ar ON au.admin_role_id = ar.id
        JOIN public.role_permissions rp ON ar.id = rp.admin_role_id
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE au.id = p_admin_user_id
        AND p.code = p_permission_code
        AND au.is_active = true
        AND ar.is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = p_user_id AND role = 'superadmin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log admin actions
CREATE OR REPLACE FUNCTION public.log_admin_action(
    p_admin_user_id UUID,
    p_action TEXT,
    p_resource_type TEXT,
    p_resource_id TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL,
    p_status TEXT DEFAULT 'success',
    p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.audit_logs (
        admin_user_id,
        action,
        resource_type,
        resource_id,
        details,
        status,
        error_message,
        ip_address,
        user_agent
    )
    VALUES (
        p_admin_user_id,
        p_action,
        p_resource_type,
        p_resource_id,
        p_details,
        p_status,
        p_error_message,
        NULL,
        NULL
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 11: Timestamps Triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_admin_roles_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_roles_timestamp
    BEFORE UPDATE ON public.admin_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_admin_roles_timestamp();

CREATE OR REPLACE FUNCTION public.update_admin_users_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_users_timestamp
    BEFORE UPDATE ON public.admin_users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_admin_users_timestamp();

-- ============================================================================
-- PART 12: Migration Completed
-- ============================================================================

COMMENT ON TABLE public.admin_roles IS 'Defines admin role types with hierarchy levels';
COMMENT ON TABLE public.permissions IS 'Defines system permissions that can be assigned to roles';
COMMENT ON TABLE public.role_permissions IS 'Maps permissions to admin roles';
COMMENT ON TABLE public.admin_users IS 'Tracks users with admin privileges and their role assignments';
COMMENT ON TABLE public.audit_logs IS 'Audit trail of all admin actions in the system';
COMMENT ON TABLE public.admin_sessions IS 'Active admin sessions for security tracking';
