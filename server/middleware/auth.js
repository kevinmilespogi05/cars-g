import { verifyToken, extractTokenFromHeader } from '../lib/jwt.js';

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
 * Admin-only middleware
 */
export function requireAdmin(req, res, next) {
  return requireRole('admin')(req, res, next);
}

/**
 * Patrol or Admin middleware
 */
export function requirePatrolOrAdmin(req, res, next) {
  return requireRole(['patrol', 'admin'])(req, res, next);
}
