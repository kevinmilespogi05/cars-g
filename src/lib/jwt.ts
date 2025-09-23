// JWT token management utilities for client-side

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface User {
  id: string;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  role: string;
  points: number;
  avatar_url?: string;
}

interface AuthResponse {
  success: boolean;
  user: User;
  tokens: TokenPair;
}

const TOKEN_STORAGE_KEY = 'cars_g_tokens';
const USER_STORAGE_KEY = 'cars_g_user';

/**
 * Store JWT tokens in localStorage
 */
export function storeTokens(tokens: TokenPair): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
  } catch (error) {
    console.error('Failed to store tokens:', error);
  }
}

/**
 * Retrieve JWT tokens from localStorage
 */
export function getStoredTokens(): TokenPair | null {
  try {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Failed to retrieve tokens:', error);
    return null;
  }
}

/**
 * Clear JWT tokens from localStorage
 */
export function clearTokens(): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear tokens:', error);
  }
}

/**
 * Store user data in localStorage
 */
export function storeUser(user: User): void {
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Failed to store user:', error);
  }
}

/**
 * Retrieve user data from localStorage
 */
export function getStoredUser(): User | null {
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Failed to retrieve user:', error);
    return null;
  }
}

/**
 * Check if a token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch (error) {
    console.error('Failed to check token expiration:', error);
    return true;
  }
}

/**
 * Get token expiration time
 */
export function getTokenExpiration(token: string): Date | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return new Date(payload.exp * 1000);
  } catch (error) {
    console.error('Failed to get token expiration:', error);
    return null;
  }
}

/**
 * Get API base URL
 */
function getApiUrl(): string {
  const isDevelopment = process.env.NODE_ENV === 'development' || 
                       window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';
  
  return isDevelopment ? 'http://localhost:3001' : 'https://cars-g-api.onrender.com';
}

/**
 * Authenticate with email and password
 */
export async function authenticateWithJWT(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${getApiUrl()}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Authentication failed');
  }

  if (data.success) {
    // Store tokens and user data
    storeTokens(data.tokens);
    storeUser(data.user);
  }

  return data;
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(): Promise<AuthResponse | null> {
  const tokens = getStoredTokens();
  
  if (!tokens?.refreshToken) {
    return null;
  }

  try {
    const response = await fetch(`${getApiUrl()}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      // Store new tokens and user data
      storeTokens(data.tokens);
      storeUser(data.user);
      return data;
    } else {
      // Refresh failed, clear stored data
      clearTokens();
      return null;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
    clearTokens();
    return null;
  }
}

/**
 * Get current user info from server
 */
export async function getCurrentUser(): Promise<User | null> {
  const tokens = getStoredTokens();
  
  if (!tokens?.accessToken) {
    return null;
  }

  try {
    const response = await fetch(`${getApiUrl()}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.ok && data.success) {
      storeUser(data.user);
      return data.user;
    } else {
      // If unauthorized, try to refresh token
      if (response.status === 401) {
        const refreshed = await refreshAccessToken();
        return refreshed?.user || null;
      }
      return null;
    }
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}

/**
 * Logout and clear all stored data
 */
export async function logoutWithJWT(): Promise<void> {
  const tokens = getStoredTokens();
  
  if (tokens?.accessToken) {
    try {
      await fetch(`${getApiUrl()}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    }
  }

  // Clear local storage regardless of server response
  clearTokens();
}

/**
 * Make authenticated API request with automatic token refresh
 */
export async function authenticatedRequest(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  const tokens = getStoredTokens();
  
  if (!tokens?.accessToken) {
    throw new Error('No access token available');
  }

  // Check if token is expired
  if (isTokenExpired(tokens.accessToken)) {
    console.log('Access token expired, attempting refresh...');
    const refreshed = await refreshAccessToken();
    
    if (!refreshed) {
      throw new Error('Failed to refresh token');
    }
    
    // Use new token
    const newTokens = getStoredTokens();
    if (!newTokens?.accessToken) {
      throw new Error('No access token available after refresh');
    }
  }

  const currentTokens = getStoredTokens();
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${currentTokens?.accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  // If unauthorized, try to refresh token once
  if (response.status === 401) {
    console.log('Request unauthorized, attempting token refresh...');
    const refreshed = await refreshAccessToken();
    
    if (refreshed) {
      // Retry the request with new token
      const newTokens = getStoredTokens();
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${newTokens?.accessToken}`,
          'Content-Type': 'application/json',
        },
      });
    }
  }

  return response;
}

/**
 * Check if user is currently authenticated
 */
export function isAuthenticated(): boolean {
  const tokens = getStoredTokens();
  const user = getStoredUser();
  
  if (!tokens?.accessToken || !user) {
    return false;
  }

  // Check if access token is expired
  if (isTokenExpired(tokens.accessToken)) {
    // If we have a refresh token, we might still be able to refresh
    return !!tokens.refreshToken && !isTokenExpired(tokens.refreshToken);
  }

  return true;
}

/**
 * Get stored user data
 */
export function getCurrentStoredUser(): User | null {
  return getStoredUser();
}

/**
 * Get stored access token
 */
export function getAccessToken(): string | null {
  const tokens = getStoredTokens();
  const token = tokens?.accessToken || null;
  
  if (token) {
    console.log('JWT Token found:', token.substring(0, 20) + '...');
    console.log('Token length:', token.length);
    
    // Check if token is expired
    if (isTokenExpired(token)) {
      console.log('JWT Token is expired');
      return null;
    } else {
      console.log('JWT Token is valid');
    }
  } else {
    console.log('No JWT token found');
  }
  
  return token;
}
