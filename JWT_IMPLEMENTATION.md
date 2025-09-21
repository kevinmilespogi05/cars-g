# JWT Authentication Implementation

This document describes the JWT (JSON Web Token) authentication implementation added to the Cars-G application.

## Overview

The application now supports JWT-based authentication alongside the existing Supabase authentication. JWT tokens provide stateless authentication and can be used for API requests and session management.

## Features

- **JWT Token Generation**: Access and refresh tokens are generated upon successful authentication
- **Automatic Token Refresh**: Access tokens are automatically refreshed using refresh tokens
- **Secure Storage**: Tokens are stored securely in localStorage
- **Fallback Authentication**: Falls back to Supabase authentication if JWT fails
- **Role-based Authorization**: JWT tokens include user roles for authorization
- **Server-side Validation**: JWT middleware validates tokens on the server

## Architecture

### Client Side (`src/lib/jwt.ts`)
- Token storage and retrieval
- Authentication requests to server
- Automatic token refresh
- Authenticated API request helper

### Server Side (`server/lib/jwt.js`)
- JWT token generation and validation
- Token pair creation (access + refresh)
- Token expiration checking

### Middleware (`server/middleware/auth.js`)
- JWT authentication middleware
- Role-based authorization
- Optional authentication for public endpoints

### Auth Store Integration (`src/store/authStore.ts`)
- JWT methods integrated into existing auth store
- Fallback to Supabase authentication
- Unified authentication interface

## API Endpoints

### Authentication Endpoints

- `POST /api/auth/login` - Authenticate with email/password and get JWT tokens
- `POST /api/auth/refresh` - Refresh access token using refresh token
- `GET /api/auth/me` - Get current user info (requires JWT token)
- `POST /api/auth/logout` - Logout and invalidate tokens
- `GET /api/auth/test` - Test protected endpoint
- `GET /api/auth/admin-test` - Test admin-only endpoint

### Request Format

**Login Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Login Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "username": "username",
    "role": "user",
    "points": 0,
    "avatar_url": null
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

## Usage

### Client Side

```typescript
import { useAuthStore } from './store/authStore';

const { signInWithJWT, isAuthenticated, user } = useAuthStore();

// Login with JWT
await signInWithJWT('user@example.com', 'password');

// Check authentication status
if (isAuthenticated) {
  console.log('User is authenticated:', user);
}
```

### Making Authenticated Requests

```typescript
import { authenticatedRequest } from './lib/jwt';

// Make authenticated API request
const response = await authenticatedRequest('/api/protected-endpoint', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
});
```

### Server Side

```javascript
import { authenticateToken, requireRole } from './middleware/auth.js';

// Protect an endpoint
app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Require admin role
app.get('/api/admin', authenticateToken, requireRole('admin'), (req, res) => {
  res.json({ message: 'Admin only' });
});
```

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
```

### Token Configuration

- **Access Token**: Short-lived (24 hours by default)
- **Refresh Token**: Long-lived (7 days by default)
- **Algorithm**: HS256
- **Issuer**: cars-g-app
- **Audience**: cars-g-users

## Security Features

1. **Token Expiration**: Tokens automatically expire
2. **Refresh Token Rotation**: New refresh tokens are issued on refresh
3. **Secure Storage**: Tokens stored in localStorage (consider httpOnly cookies for production)
4. **Role-based Access**: JWT includes user roles for authorization
5. **Server Validation**: All tokens are validated on the server

## Testing

A test component (`JWTTest`) is available in development mode to test JWT functionality:

- Test JWT authentication status
- Test protected endpoints
- Test admin-only endpoints
- Test token refresh

## Migration Notes

- Existing Supabase authentication continues to work
- JWT authentication is used as primary method with Supabase fallback
- No breaking changes to existing authentication flow
- JWT tokens are generated alongside Supabase sessions

## Production Considerations

1. **Change JWT Secret**: Use a strong, unique secret in production
2. **HTTPS Only**: Ensure all communication is over HTTPS
3. **Token Storage**: Consider using httpOnly cookies instead of localStorage
4. **Rate Limiting**: Implement rate limiting on authentication endpoints
5. **Monitoring**: Monitor token usage and refresh patterns

## Troubleshooting

### Common Issues

1. **Token Expired**: Check if access token has expired, refresh token should work
2. **Invalid Token**: Verify JWT secret matches between client and server
3. **CORS Issues**: Ensure server CORS configuration includes client origin
4. **Network Errors**: Check if server is running and accessible

### Debug Mode

Enable debug logging by setting `NODE_ENV=development` to see detailed JWT logs.
