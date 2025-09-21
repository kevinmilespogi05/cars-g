# JWT Token Usage Examples

This document shows how to use the JWT authentication system in your Cars-G application.

## 🚀 Quick Start

### 1. Login and Get Tokens

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }'
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "email": "your-email@example.com",
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

### 2. Use Access Token for Protected Requests

```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. Refresh Access Token

```bash
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

## 🔧 Frontend Integration

### Using with JavaScript/TypeScript

```typescript
// Login function
async function login(email: string, password: string) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  
  if (data.success) {
    // Store tokens in localStorage
    localStorage.setItem('accessToken', data.tokens.accessToken);
    localStorage.setItem('refreshToken', data.tokens.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return data;
  } else {
    throw new Error(data.error);
  }
}

// Make authenticated requests
async function authenticatedRequest(url: string, options: RequestInit = {}) {
  const accessToken = localStorage.getItem('accessToken');
  
  if (!accessToken) {
    throw new Error('No access token available');
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (response.status === 401) {
    // Token expired, try to refresh
    const refreshed = await refreshToken();
    if (refreshed) {
      // Retry the request with new token
      return authenticatedRequest(url, options);
    } else {
      // Refresh failed, redirect to login
      window.location.href = '/login';
    }
  }

  return response;
}

// Refresh token function
async function refreshToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  
  if (!refreshToken) {
    return false;
  }

  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem('accessToken', data.tokens.accessToken);
      localStorage.setItem('refreshToken', data.tokens.refreshToken);
      return true;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
  }
  
  return false;
}
```

## 🛡️ Server-Side Usage

### Protecting Routes

```javascript
import { authenticateToken, requireRole } from './middleware/auth.js';

// Protect a route
app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({ 
    message: 'This is a protected route',
    user: req.user 
  });
});

// Require admin role
app.get('/api/admin', authenticateToken, requireRole('admin'), (req, res) => {
  res.json({ 
    message: 'Admin only route',
    user: req.user 
  });
});

// Require multiple roles
app.get('/api/moderator', authenticateToken, requireRole(['admin', 'moderator']), (req, res) => {
  res.json({ 
    message: 'Moderator or admin route',
    user: req.user 
  });
});
```

## 🔐 Token Structure

### Access Token Payload
```json
{
  "userId": "user-id",
  "email": "user@example.com",
  "role": "user",
  "username": "username",
  "type": "access",
  "iat": 1758378531,
  "exp": 1758464931,
  "aud": "cars-g-users",
  "iss": "cars-g-app"
}
```

### Refresh Token Payload
```json
{
  "userId": "user-id",
  "email": "user@example.com",
  "role": "user",
  "username": "username",
  "type": "refresh",
  "iat": 1758378531,
  "exp": 1758983331,
  "aud": "cars-g-users",
  "iss": "cars-g-app"
}
```

## ⚙️ Configuration

### Environment Variables

Add these to your `.env` file:

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
```

### Token Expiration

- **Access Token**: 24 hours (configurable)
- **Refresh Token**: 7 days (configurable)
- **Algorithm**: HS256
- **Issuer**: cars-g-app
- **Audience**: cars-g-users

## 🧪 Testing

### Test JWT Generation

Run the test script to verify JWT functionality:

```bash
node test-jwt-token.js
```

### Test API Endpoints

```bash
# Test login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Test protected endpoint
curl -X GET http://localhost:3001/api/auth/test \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Test admin endpoint
curl -X GET http://localhost:3001/api/auth/admin-test \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

## 🔒 Security Best Practices

1. **Change JWT Secret**: Use a strong, unique secret in production
2. **HTTPS Only**: Ensure all communication is over HTTPS
3. **Token Storage**: Consider using httpOnly cookies instead of localStorage
4. **Rate Limiting**: Implement rate limiting on authentication endpoints
5. **Token Rotation**: Consider implementing token blacklisting for logout

## 🚨 Error Handling

### Common Error Codes

- `MISSING_CREDENTIALS`: Email and password are required
- `INVALID_CREDENTIALS`: Invalid email or password
- `MISSING_TOKEN`: Access token required
- `INVALID_TOKEN`: Invalid or malformed token
- `TOKEN_EXPIRED`: Token has expired
- `INVALID_TOKEN_TYPE`: Wrong token type (access vs refresh)
- `INSUFFICIENT_PERMISSIONS`: User doesn't have required role

### Error Response Format

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```
