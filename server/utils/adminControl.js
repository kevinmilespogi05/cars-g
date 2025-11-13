/**
 * Admin Permission and Access Control Utilities
 * 
 * Professional-grade permission checking for admin operations
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Check if a user has a specific permission
 * @param {Object} supabaseAdmin - Supabase admin client
 * @param {string} userId - User ID to check
 * @param {string} permissionCode - Permission code (e.g., 'user.ban', 'admin.create')
 * @returns {Promise<boolean>}
 */
export async function hasPermission(supabaseAdmin, userId, permissionCode) {
  try {
    const { data, error } = await supabaseAdmin
      .rpc('has_permission', {
        p_admin_user_id: userId,
        p_permission_code: permissionCode
      });

    if (error) {
      console.error('Permission check error:', error);
      return false;
    }

    return data === true;
  } catch (err) {
    console.error('Permission check exception:', err);
    return false;
  }
}

/**
 * Check if a user is a superadmin
 * @param {Object} supabaseAdmin - Supabase admin client
 * @param {string} userId - User ID to check
 * @returns {Promise<boolean>}
 */
export async function isSuperAdmin(supabaseAdmin, userId) {
  try {
    const { data, error } = await supabaseAdmin
      .rpc('is_superadmin', {
        p_user_id: userId
      });

    if (error) {
      console.error('Superadmin check error:', error);
      return false;
    }

    return data === true;
  } catch (err) {
    console.error('Superadmin check exception:', err);
    return false;
  }
}

/**
 * Get user's admin role and permissions
 * @param {Object} supabaseAdmin - Supabase admin client
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>}
 */
export async function getAdminRoleAndPermissions(supabaseAdmin, userId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('admin_users')
      .select(`
        id,
        admin_role_id,
        admin_roles:admin_role_id (
          id,
          name,
          title,
          description,
          hierarchy_level
        ),
        role_permissions:admin_roles(role_permissions(permissions(code, name, category)))
      `)
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Failed to fetch admin role:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Failed to fetch admin role:', err);
    return null;
  }
}

/**
 * Log an admin action for audit trail
 * @param {Object} supabaseAdmin - Supabase admin client
 * @param {string} adminUserId - Admin user ID
 * @param {string} action - Action performed
 * @param {string} resourceType - Type of resource affected
 * @param {string} resourceId - ID of resource affected
 * @param {Object} details - Additional details
 * @param {string} status - 'success' or 'failure'
 * @param {string} errorMessage - Error message if failed
 * @returns {Promise<UUID|null>}
 */
export async function logAdminAction(
  supabaseAdmin,
  adminUserId,
  action,
  resourceType,
  resourceId = null,
  details = null,
  status = 'success',
  errorMessage = null
) {
  try {
    const { data, error } = await supabaseAdmin
      .rpc('log_admin_action', {
        p_admin_user_id: adminUserId,
        p_action: action,
        p_resource_type: resourceType,
        p_resource_id: resourceId,
        p_details: details,
        p_status: status,
        p_error_message: errorMessage
      });

    if (error) {
      console.error('Audit logging error:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Audit logging exception:', err);
    return null;
  }
}

/**
 * Create a new admin user with role assignment
 * @param {Object} supabaseAdmin - Supabase admin client
 * @param {string} userId - Profile ID of user
 * @param {string} adminRoleId - Admin role UUID
 * @param {string} createdBy - Admin user ID creating this admin
 * @returns {Promise<Object|null>}
 */
export async function createAdminUser(supabaseAdmin, userId, adminRoleId, createdBy) {
  try {
    // Verify user exists
    const { data: userExists, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError || !userExists) {
      throw new Error('User not found');
    }

    // Create admin_users entry
    const { data, error } = await supabaseAdmin
      .from('admin_users')
      .insert({
        id: userId,
        admin_role_id: adminRoleId,
        created_by: createdBy,
        is_active: true
      })
      .select();

    if (error) {
      throw error;
    }

    // Log the action
    await logAdminAction(
      supabaseAdmin,
      createdBy,
      'create_admin',
      'admin_users',
      userId,
      { admin_role_id: adminRoleId },
      'success'
    );

    return data[0];
  } catch (err) {
    console.error('Failed to create admin user:', err);
    return null;
  }
}

/**
 * Remove admin privileges from a user
 * @param {Object} supabaseAdmin - Supabase admin client
 * @param {string} userId - Admin user ID to remove
 * @param {string} removedBy - Admin user ID performing the removal
 * @returns {Promise<boolean>}
 */
export async function removeAdminUser(supabaseAdmin, userId, removedBy) {
  try {
    // Get admin role before deletion
    const { data: adminData } = await supabaseAdmin
      .from('admin_users')
      .select('admin_role_id')
      .eq('id', userId)
      .single();

    // Delete admin_users entry
    const { error } = await supabaseAdmin
      .from('admin_users')
      .delete()
      .eq('id', userId);

    if (error) {
      throw error;
    }

    // Log the action
    await logAdminAction(
      supabaseAdmin,
      removedBy,
      'remove_admin',
      'admin_users',
      userId,
      { previous_role_id: adminData?.admin_role_id },
      'success'
    );

    return true;
  } catch (err) {
    console.error('Failed to remove admin user:', err);
    return false;
  }
}

/**
 * Get audit logs for a specific resource or user
 * @param {Object} supabaseAdmin - Supabase admin client
 * @param {Object} filters - Filter options
 * @param {string} filters.adminUserId - Filter by admin user
 * @param {string} filters.resourceType - Filter by resource type
 * @param {string} filters.action - Filter by action
 * @param {number} filters.limit - Limit results (default 100)
 * @param {number} filters.offset - Offset for pagination
 * @returns {Promise<Array>}
 */
export async function getAuditLogs(supabaseAdmin, filters = {}) {
  try {
    const {
      adminUserId = null,
      resourceType = null,
      action = null,
      limit = 100,
      offset = 0
    } = filters;

    let query = supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (adminUserId) query = query.eq('admin_user_id', adminUserId);
    if (resourceType) query = query.eq('resource_type', resourceType);
    if (action) query = query.eq('action', action);

    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      throw error;
    }

    return { logs: data, total: count };
  } catch (err) {
    console.error('Failed to fetch audit logs:', err);
    return { logs: [], total: 0 };
  }
}

export default {
  hasPermission,
  isSuperAdmin,
  getAdminRoleAndPermissions,
  logAdminAction,
  createAdminUser,
  removeAdminUser,
  getAuditLogs
};
