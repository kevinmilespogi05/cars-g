import { verifyToken, extractTokenFromHeader } from '../lib/jwt.js';
import { hasPermission } from '../utils/adminControl.js';

/**
 * JWT Authentication Middleware
 * Verifies JWT tokens and adds user info to request object
 */
export function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        code: 'MISSING_TOKEN'
      });
    }

    // Verify the token
    const decoded = verifyToken(token);
    
    // Check if it's an access token
    if (decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token type',
        code: 'INVALID_TOKEN_TYPE'
      });
    }

    // Add user info to request object
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      username: decoded.username
    };

    next();
  } catch (error) {
    console.error('JWT Authentication Error:', error.message);
    
    let statusCode = 401;
    let errorCode = 'INVALID_TOKEN';
    
    if (error.message === 'Token has expired') {
      statusCode = 401;
      errorCode = 'TOKEN_EXPIRED';
    } else if (error.message === 'Invalid token') {
      statusCode = 401;
      errorCode = 'INVALID_TOKEN';
    }

    return res.status(statusCode).json({
      success: false,
      error: error.message,
      code: errorCode
    });
  }
}

/**
 * Optional JWT Authentication Middleware
 * Verifies JWT tokens if present, but doesn't require them
 */
export function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      const decoded = verifyToken(token);
      
      if (decoded.type === 'access') {
        req.user = {
          id: decoded.userId,
          email: decoded.email,
          role: decoded.role,
          username: decoded.username
        };
      }
    }

    next();
  } catch (error) {
    // For optional auth, we just continue without user info
    console.warn('Optional auth failed:', error.message);
    next();
  }
}

/**
 * Role-based authorization middleware
 * @param {string|string[]} allowedRoles - Role or array of roles that are allowed
 */
export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRole = req.user.role;
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    // Treat 'admin' as including 'superadmin' so existing checks that require 'admin'
    // will also accept 'superadmin' without changing every call site.
    if (roles.includes('admin') && !roles.includes('superadmin')) {
      roles.push('superadmin');
    }

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: roles,
        current: userRole
      });
    }

    next();
  };
}

/**
 * Permission-based authorization middleware (for new RBAC system)
 * Checks if user has specific permission code
 * @param {string|string[]} requiredPermissions - Permission code(s) required
 * @param {Object} supabaseAdmin - Supabase admin client
 */
export function requirePermission(requiredPermissions, supabaseAdmin) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Superadmins always have all permissions
    if (req.user.role === 'superadmin') {
      return next();
    }

    const permissions = Array.isArray(requiredPermissions) 
      ? requiredPermissions 
      : [requiredPermissions];

    // Check if user has at least one of the required permissions
    for (const permission of permissions) {
      const hasAccess = await hasPermission(supabaseAdmin, req.user.id, permission);
      if (hasAccess) {
        return next();
      }
    }

    return res.status(403).json({
      success: false,
      error: 'Missing required permissions',
      code: 'INSUFFICIENT_PERMISSIONS',
      required: permissions,
      current: req.user.role
    });
  };
}

/**
 * Admin-only middleware
 */
export function requireAdmin(req, res, next) {
  return requireRole('admin')(req, res, next);
}

/**
 * Superadmin-only middleware
 */
export function requireSuperAdmin(req, res, next) {
  return requireRole('superadmin')(req, res, next);
}

/**
 * Patrol or Admin middleware
 */
export function requirePatrolOrAdmin(req, res, next) {
  return requireRole(['patrol', 'admin'])(req, res, next);
}

/**
 * Require verified middleware
 * Ensures the user's profile has an active verification status.
 * @param {object} supabaseClient - Supabase admin or client instance
 */
export function requireVerified(supabaseClient) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
    }

    try {
      const client = supabaseClient;
      if (!client) {
        // If no admin client provided, allow (cannot enforce)
        return next();
      }

      const { data: profile, error } = await client
        .from('profiles')
        .select('verification_status')
        .eq('id', req.user.id)
        .maybeSingle();

      if (error) {
        console.error('requireVerified: failed to fetch profile', error);
        return res.status(500).json({ success: false, error: 'Failed to validate verification status', code: 'PROFILE_ERROR' });
      }

      const status = (profile && profile.verification_status) ? profile.verification_status : 'pending';

      // Allow only explicitly active/verified statuses
      const allowed = ['active', 'verified', 'ai_verified'];
      if (!allowed.includes(status)) {
        return res.status(403).json({ success: false, error: 'Account verification required to access this resource', code: 'VERIFICATION_REQUIRED', verification_status: status });
      }

      return next();
    } catch (e) {
      console.error('requireVerified error', e);
      return res.status(500).json({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' });
    }
  };
}
