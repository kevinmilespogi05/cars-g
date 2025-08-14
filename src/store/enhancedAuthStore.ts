import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useOutageHandler } from '../lib/supabaseOutageHandler.tsx';
import { outageUtils } from '../lib/supabaseOutageHandler.tsx';

interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  points: number;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  lastSync: Date | null;
}

interface AuthActions {
  // Core auth functions
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  
  // Enhanced functions with outage handling
  initialize: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  
  // Offline support
  getOfflineUser: () => User | null;
  isOfflineMode: () => boolean;
  syncOfflineData: () => Promise<void>;
  
  // State management
  setError: (error: string | null) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

// Cache keys
const CACHE_KEYS = {
  USER: 'auth_user_cache',
  AUTH_TOKEN: 'auth_token_cache',
  LAST_SYNC: 'auth_last_sync',
  OFFLINE_ACTIONS: 'auth_offline_actions'
};

// Cache TTL (24 hours)
const CACHE_TTL = 24 * 60 * 60 * 1000;

export const useEnhancedAuthStore = create<AuthState & AuthActions>((set, get) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  lastSync: null,

  // Core auth functions with enhanced error handling
  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // Check if we're in offline mode
      if (!navigator.onLine) {
        throw new Error('No internet connection. Please check your network and try again.');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      if (data.user) {
        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
          
        if (profileError) throw profileError;

        const userData = { ...profile, email: data.user.email };
        
        // Cache user data for offline use
        cacheUserData(userData);
        
        set({ 
          user: userData,
          isAuthenticated: true,
          lastSync: new Date(),
          error: null
        });
      }
    } catch (error: any) {
      const errorMessage = getEnhancedErrorMessage(error);
      set({ error: errorMessage, isLoading: false });
      throw new Error(errorMessage);
    } finally {
      set({ isLoading: false });
    }
  },

  signUp: async (email: string, password: string, username: string) => {
    set({ isLoading: true, error: null });
    
    try {
      if (!navigator.onLine) {
        throw new Error('No internet connection. Please check your network and try again.');
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      
      if (data.user) {
        // Create user profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            username: username,
            email: data.user.email || '',
            points: 0,
            role: 'user',
          });

        if (profileError) throw profileError;
        
        set({ 
          error: null,
          isLoading: false 
        });
      }
    } catch (error: any) {
      const errorMessage = getEnhancedErrorMessage(error);
      set({ error: errorMessage, isLoading: false });
      throw new Error(errorMessage);
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
      clearCachedUserData();
      set({ 
        user: null, 
        isAuthenticated: false, 
        lastSync: null,
        error: null 
      });
    } catch (error: any) {
      console.error('Error signing out:', error);
      // Force local signout even if Supabase fails
      clearCachedUserData();
      set({ 
        user: null, 
        isAuthenticated: false, 
        lastSync: null,
        error: null 
      });
    }
  },

  signInWithGoogle: async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });
      
      if (error) throw error;
    } catch (error: any) {
      const errorMessage = getEnhancedErrorMessage(error);
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  signInWithFacebook: async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });
      
      if (error) throw error;
    } catch (error: any) {
      const errorMessage = getEnhancedErrorMessage(error);
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  // Enhanced initialization with offline support
  initialize: async () => {
    try {
      set({ isLoading: true });
      
      // Try to get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Try to fetch fresh user data
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          if (profileError) throw profileError;

          const userData = { ...profile, email: session.user.email };
          cacheUserData(userData);
          
          set({ 
            user: userData,
            isAuthenticated: true,
            lastSync: new Date(),
            isLoading: false
          });
        } catch (error) {
          // Fallback to cached data if available
          const cachedUser = getOfflineUser();
          if (cachedUser) {
            set({ 
              user: cachedUser,
              isAuthenticated: true,
              lastSync: getLastSyncTime(),
              isLoading: false
            });
          } else {
            set({ 
              user: null, 
              isAuthenticated: false, 
              isLoading: false 
            });
          }
        }
      } else {
        // Check for cached user data
        const cachedUser = getOfflineUser();
        if (cachedUser && isCacheValid(getLastSyncTime())) {
          set({ 
            user: cachedUser,
            isAuthenticated: true,
            lastSync: getLastSyncTime(),
            isLoading: false
          });
        } else {
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false 
          });
        }
      }
    } catch (error: any) {
      console.error('Error initializing auth:', error);
      // Fallback to cached data
      const cachedUser = getOfflineUser();
      if (cachedUser && isCacheValid(getLastSyncTime())) {
        set({ 
          user: cachedUser,
          isAuthenticated: true,
          lastSync: getLastSyncTime(),
          isLoading: false
        });
      } else {
        set({ 
          user: null, 
          isAuthenticated: false, 
          isLoading: false 
        });
      }
    }
  },

  refreshUser: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (profileError) throw profileError;

        const userData = { ...profile, email: user.email };
        cacheUserData(userData);
        
        set({ 
          user: userData,
          lastSync: new Date()
        });
      }
    } catch (error: any) {
      console.error('Error refreshing user:', error);
      // Continue with cached data
    }
  },

  updateProfile: async (updates: Partial<User>) => {
    const currentUser = get().user;
    if (!currentUser) throw new Error('No user logged in');

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', currentUser.id);

      if (error) throw error;

      const updatedUser = { ...currentUser, ...updates };
      cacheUserData(updatedUser);
      
      set({ 
        user: updatedUser,
        lastSync: new Date()
      });
    } catch (error: any) {
      // Store update for later sync if offline
      if (!navigator.onLine) {
        storeOfflineAction('updateProfile', { userId: currentUser.id, updates });
      }
      throw error;
    }
  },

  // Offline support functions
  getOfflineUser: () => {
    try {
      const cached = localStorage.getItem(CACHE_KEYS.USER);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (outageUtils.isCacheValid(timestamp, CACHE_TTL)) {
          return data;
        }
      }
      return null;
    } catch {
      return null;
    }
  },

  isOfflineMode: () => {
    return !navigator.onLine || get().lastSync === null;
  },

  syncOfflineData: async () => {
    try {
      const offlineActions = getOfflineActions();
      if (offlineActions.length === 0) return;

      for (const action of offlineActions) {
        try {
          await processOfflineAction(action);
        } catch (error) {
          console.error('Failed to process offline action:', action, error);
        }
      }

      clearOfflineActions();
    } catch (error) {
      console.error('Error syncing offline data:', error);
    }
  },

  // State management
  setError: (error: string | null) => set({ error }),
  clearError: () => set({ error: null }),
  setLoading: (loading: boolean) => set({ isLoading: loading }),
}));

// Helper functions
function getEnhancedErrorMessage(error: any): string {
  if (error.message?.includes('Failed to fetch') || 
      error.message?.includes('net::ERR_INTERNET_DISCONNECTED') ||
      error.message?.includes('NetworkError') ||
      !navigator.onLine) {
    return 'No internet connection. Please check your network and try again.';
  }
  
  if (error.message?.includes('Invalid login credentials')) {
    return 'Invalid email or password. Please try again.';
  }
  
  if (error.message?.includes('Email not confirmed')) {
    return 'Please check your email and confirm your account before signing in.';
  }
  
  if (error.message?.includes('Too many requests')) {
    return 'Too many login attempts. Please wait a moment and try again.';
  }
  
  return error.message || 'An unexpected error occurred. Please try again.';
}

function cacheUserData(userData: User): void {
  try {
    localStorage.setItem(CACHE_KEYS.USER, JSON.stringify({
      data: userData,
      timestamp: Date.now(),
      ttl: CACHE_TTL
    }));
  } catch (error) {
    console.warn('Failed to cache user data:', error);
  }
}

function clearCachedUserData(): void {
  try {
    localStorage.removeItem(CACHE_KEYS.USER);
    localStorage.removeItem(CACHE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(CACHE_KEYS.LAST_SYNC);
  } catch (error) {
    console.warn('Failed to clear cached user data:', error);
  }
}

function getLastSyncTime(): Date | null {
  try {
    const cached = localStorage.getItem(CACHE_KEYS.LAST_SYNC);
    return cached ? new Date(cached) : null;
  } catch {
    return null;
  }
}

function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_TTL;
}

function storeOfflineAction(type: string, data: any): void {
  try {
    const actions = getOfflineActions();
    actions.push({ type, data, timestamp: Date.now() });
    localStorage.setItem(CACHE_KEYS.OFFLINE_ACTIONS, JSON.stringify(actions));
  } catch (error) {
    console.warn('Failed to store offline action:', error);
  }
}

function getOfflineActions(): any[] {
  try {
    const cached = localStorage.getItem(CACHE_KEYS.OFFLINE_ACTIONS);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
}

function clearOfflineActions(): void {
  try {
    localStorage.removeItem(CACHE_KEYS.OFFLINE_ACTIONS);
  } catch (error) {
    console.warn('Failed to clear offline actions:', error);
  }
}

async function processOfflineAction(action: any): Promise<void> {
  // Implement offline action processing logic here
  // This would handle things like profile updates, etc.
  console.log('Processing offline action:', action);
}
