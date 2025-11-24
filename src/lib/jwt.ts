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

const TOKEN_STORAGE_KEY = 'bantay_sp_tokens';
const USER_STORAGE_KEY = 'bantay_sp_user';

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
  // Use the same logic as the main config
  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  
  console.log('🔧 JWT getApiUrl() called:', {
    hostname,
    isLocalhost,
    protocol: window.location.protocol,
    origin: window.location.origin
  });
  
  // CRITICAL: Always use production URL when not on localhost
  if (!isLocalhost) {
    const productionUrl = 'https://cars-g-api.onrender.com';
    console.log('🌐 JWT using production URL:', productionUrl);
    return productionUrl;
  }
  
  // Only use localhost for actual local development
  const localhostUrl = 'http://localhost:3001';
  console.log('🏠 JWT using localhost URL:', localhostUrl);
  return localhostUrl;
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
    // Attach the code to the thrown error so callers can handle specific cases
    const err: any = new Error(data.error || 'Authentication failed');
    err.code = data?.code || null;
    throw err;
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
  
  console.log('👤 Getting current user from server...');
  console.log('🔑 Token available:', !!tokens?.accessToken);
  
  if (!tokens?.accessToken) {
    console.log('❌ No access token available');
    return null;
  }

  try {
    const apiUrl = getApiUrl();
    console.log('🌐 Making request to:', `${apiUrl}/api/auth/me`);
    
    const response = await fetch(`${apiUrl}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📡 Response status:', response.status);
    const data = await response.json();
    console.log('📋 Response data:', data);

    if (response.ok && data.success) {
      console.log('✅ User retrieved successfully:', data.user.email);
      storeUser(data.user);
      return data.user;
    } else {
      console.log('❌ Failed to get user, status:', response.status);
      // If unauthorized, try to refresh token
      if (response.status === 401) {
        console.log('🔄 Token expired, trying to refresh...');
        const refreshed = await refreshAccessToken();
        return refreshed?.user || null;
      }
      return null;
    }
  } catch (error) {
    console.error('❌ Failed to get current user:', error);
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
 * Supports both JWT tokens and Supabase session tokens
 */
export async function authenticatedRequest(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  const tokens = getStoredTokens();
  let authToken: string | null = null;
  
  // Try JWT token first
  if (tokens?.accessToken) {
    // Check if token is expired
    if (isTokenExpired(tokens.accessToken)) {
      console.log('Access token expired, attempting refresh...');
      const refreshed = await refreshAccessToken();
      
      if (refreshed) {
        const newTokens = getStoredTokens();
        authToken = newTokens?.accessToken || null;
      }
    } else {
      authToken = tokens.accessToken;
    }
  }
  
  // Fallback to Supabase session token if JWT is not available
  if (!authToken) {
    try {
      const { supabase } = await import('./supabase');
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        authToken = session.access_token;
      }
    } catch (error) {
      console.warn('Failed to get Supabase session:', error);
    }
  }
  
  if (!authToken) {
    throw new Error('No access token available');
  }
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  });

  // If unauthorized, try to refresh token once
  if (response.status === 401) {
    console.log('Request unauthorized, attempting token refresh...');
    
    // Try JWT refresh first
    if (tokens?.refreshToken) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        const newTokens = getStoredTokens();
        if (newTokens?.accessToken) {
          // Retry the request with new JWT token
          return fetch(url, {
            ...options,
            headers: {
              ...options.headers,
              'Authorization': `Bearer ${newTokens.accessToken}`,
              'Content-Type': 'application/json',
            },
          });
        }
      }
    }
    
    // Try Supabase session refresh
    try {
      const { supabase } = await import('./supabase');
      const { data: { session } } = await supabase.auth.refreshSession();
      if (session?.access_token) {
        // Retry the request with refreshed Supabase token
        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.warn('Failed to refresh Supabase session:', error);
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
  
  console.log('🔍 JWT Authentication Check:', {
    hasTokens: !!tokens,
    hasAccessToken: !!tokens?.accessToken,
    hasRefreshToken: !!tokens?.refreshToken,
    hasUser: !!user,
    accessTokenExpired: tokens?.accessToken ? isTokenExpired(tokens.accessToken) : 'N/A',
    refreshTokenExpired: tokens?.refreshToken ? isTokenExpired(tokens.refreshToken) : 'N/A'
  });
  
  if (!tokens?.accessToken || !user) {
    console.log('❌ JWT Authentication failed: Missing tokens or user data');
    return false;
  }

  // Check if access token is expired
  if (isTokenExpired(tokens.accessToken)) {
    console.log('⚠️ Access token expired, checking refresh token...');
    // If we have a refresh token, we might still be able to refresh
    const canRefresh = !!tokens.refreshToken && !isTokenExpired(tokens.refreshToken);
    console.log('🔄 Can refresh token:', canRefresh);
    return canRefresh;
  }

  console.log('✅ JWT Authentication successful');
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
    // Check if token is expired
    if (isTokenExpired(token)) {
      return null;
    }
  }
  
  return token;
}
