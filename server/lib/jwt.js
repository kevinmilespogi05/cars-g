import jwt from 'jsonwebtoken';

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Generate a JWT token for a user
 * @param {Object} user - User object containing id, email, role, etc.
 * @param {string} type - Token type ('access' or 'refresh')
 * @returns {string} JWT token
 */
export function generateToken(user, type = 'access') {
  const now = Date.now();
  const iat = Math.floor(now / 1000);
  
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    username: user.username,
    type: type,
    iat: iat,
    jti: `${user.id}-${type}-${now}` // JWT ID to ensure uniqueness
  };
  

  const expiresIn = type === 'refresh' ? JWT_REFRESH_EXPIRES_IN : JWT_EXPIRES_IN;
  
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn,
    issuer: 'cars-g-app',
    audience: 'cars-g-users'
  });
}

/**
 * Generate both access and refresh tokens for a user
 * @param {Object} user - User object
 * @returns {Object} Object containing accessToken and refreshToken
 */
export function generateTokenPair(user) {
  return {
    accessToken: generateToken(user, 'access'),
    refreshToken: generateToken(user, 'refresh')
  };
}

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
export function verifyToken(token) {
  try {
    console.log('Verifying JWT token...');
    console.log('Token length:', token.length);
    console.log('JWT_SECRET available:', !!JWT_SECRET);
    
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'cars-g-app',
      audience: 'cars-g-users'
    });
    
    console.log('JWT token verified successfully:', { userId: decoded.userId, type: decoded.type });
    return decoded;
  } catch (error) {
    console.error('JWT verification error:', error.message);
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else {
      throw new Error('Token verification failed');
    }
  }
}

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Extracted token or null
 */
export function extractTokenFromHeader(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

/**
 * Check if token is expired
 * @param {string} token - JWT token to check
 * @returns {boolean} True if token is expired
 */
export function isTokenExpired(token) {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return true;
    }
    return Date.now() >= decoded.exp * 1000;
  } catch (error) {
    return true;
  }
}

/**
 * Get token expiration time
 * @param {string} token - JWT token
 * @returns {Date|null} Expiration date or null if invalid
 */
export function getTokenExpiration(token) {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return null;
    }
    return new Date(decoded.exp * 1000);
  } catch (error) {
    return null;
  }
}

/**
 * Refresh an access token using a refresh token
 * @param {string} refreshToken - Valid refresh token
 * @param {Object} user - User object
 * @returns {Object} New token pair
 */
export function refreshAccessToken(refreshToken, user) {
  const decoded = verifyToken(refreshToken);
  
  if (decoded.type !== 'refresh') {
    throw new Error('Invalid token type for refresh');
  }
  
  if (decoded.userId !== user.id) {
    throw new Error('Token user mismatch');
  }
  
  return generateTokenPair(user);
}
