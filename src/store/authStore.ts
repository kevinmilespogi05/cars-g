import React from 'react';
import { create } from 'zustand';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { initializeUserStats, verifyDatabaseSchema, debugDatabaseIssue } from '../lib/initAchievements';
import { 
  authenticateWithJWT, 
  refreshAccessToken, 
  getCurrentUser, 
  logoutWithJWT, 
  isAuthenticated as isJWTAuthenticated,
  getCurrentStoredUser,
  clearTokens,
  storeTokens,
  storeUser
} from '../lib/jwt';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithUsername: (username: string, password: string) => Promise<void>;
  signInWithEmailOrUsername: (emailOrUsername: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string, firstName?: string, lastName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  // JWT methods
  signInWithJWT: (email: string, password: string) => Promise<void>;
  refreshJWTToken: () => Promise<boolean>;
  checkJWTAuthentication: () => boolean;
  initializeJWT: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  
  // Add session monitoring
  _startSessionMonitoring: () => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session && useAuthStore.getState().isAuthenticated) {
          console.log('Session lost during monitoring, updating state');
          set({ user: null, isAuthenticated: false });
        }
      } catch (error) {
        console.warn('Session monitoring error:', error);
      }
    };
    
    // Check every 5 minutes
    const interval = setInterval(checkSession, 5 * 60 * 1000);
    
    // Return cleanup function
    return () => clearInterval(interval);
  },
  
  initialize: async () => {
    try {
      // First try JWT authentication
      await useAuthStore.getState().initializeJWT();
      
      // If JWT authentication succeeded, we're done
      if (useAuthStore.getState().isAuthenticated) {
        return;
      }

      // Fallback to Supabase authentication
      // Get initial session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.warn('Error getting session:', error);
        set({ user: null, isAuthenticated: false });
        return;
      }
      
      if (!session) {
        set({ user: null, isAuthenticated: false });
        return;
      }
      
      // Validate session is not expired
      if (session.expires_at && new Date(session.expires_at * 1000) < new Date()) {
        console.log('Session expired, cleaning up');
        await supabase.auth.signOut();
        set({ user: null, isAuthenticated: false });
        return;
      }
      
      if (session?.user) {
        // Fetch the user's profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
          
        if (profileError && profileError.code !== 'PGRST116' && String((profileError as any).status) !== '406') {
          throw profileError;
        }
        
        if (!profile) {
          // Create profile for new user
          const { error: createError } = await supabase
            .from('profiles')
            .upsert({
              id: session.user.id,
              username: session.user.email?.split('@')[0] || 'user',
              email: session.user.email || '',
              points: 0,
              role: 'user',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              avatar_url: session.user.user_metadata.avatar_url || null,
              notification_settings: { push: true, email: true }
            }, { onConflict: 'id', ignoreDuplicates: false });
            
          if (createError) {
            // If FK violation or RLS/format errors, skip creating profile (likely not a Supabase-auth user)
            const code = (createError as any).code || '';
            if (code === '23503' || String((createError as any).status) === '406' || String((createError as any).status) === '409') {
              console.warn('Skipping profile auto-create due to database constraint/status:', createError);
            } else {
              throw createError;
            }
          } else {
            // Initialize user stats
            await debugDatabaseIssue();
            await verifyDatabaseSchema();
            await initializeUserStats(session.user.id);
          }

          // Fetch the newly created profile
          const { data: newProfile, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();
            
          if (fetchError && String((fetchError as any).status) !== '406') throw fetchError;
          
          set({ 
            user: newProfile ? { ...newProfile, email: session.user.email } : { id: session.user.id, email: session.user.email } as any,
            isAuthenticated: true,
          });
        } else {
          // If user is banned, immediately sign out and stop initializing
          if (profile.is_banned) {
            await supabase.auth.signOut();
            set({ user: null, isAuthenticated: false });
            return;
          }
          // Initialize user stats if they don't exist
          // First debug the database issue and verify the schema
          try {
            await debugDatabaseIssue();
            await verifyDatabaseSchema();
            await initializeUserStats(session.user.id);
          } catch (e) {
            console.warn('Skipping stats initialization:', e);
          }
          
          set({ 
            user: { ...profile, email: session.user.email },
            isAuthenticated: true,
          });
        }
      }

      // Set up auth state listener with improved error handling
      supabase.auth.onAuthStateChange(async (event, session) => {
        try {
          if (event === 'SIGNED_IN' && session?.user) {
            // Check if profile exists
            const { data: existingProfile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();
              
            if (profileError && profileError.code !== 'PGRST116' && String((profileError as any).status) !== '406') {
              throw profileError;
            }
            
            if (!existingProfile) {
              // Create profile for new user
              const { error: createError } = await supabase
                .from('profiles')
                .upsert({
                  id: session.user.id,
                  username: session.user.email?.split('@')[0] || 'user',
                  email: session.user.email || '',
                  points: 0,
                  role: 'user',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  avatar_url: session.user.user_metadata.avatar_url || null,
                  notification_settings: { push: true, email: true }
                }, { onConflict: 'id', ignoreDuplicates: false });
                
              if (createError) {
                const code = (createError as any).code || '';
                if (code === '23503' || String((createError as any).status) === '406' || String((createError as any).status) === '409') {
                  console.warn('Skipping profile auto-create due to database constraint/status:', createError);
                } else {
                  throw createError;
                }
              } else {
                // Initialize user stats
                await debugDatabaseIssue();
                await verifyDatabaseSchema();
                await initializeUserStats(session.user.id);
              }

              // Initialize user stats
              await debugDatabaseIssue();
              await verifyDatabaseSchema();
              await initializeUserStats(session.user.id);
              
              // Fetch the newly created profile
              const { data: newProfile, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle();
                
              if (fetchError && String((fetchError as any).status) !== '406') throw fetchError;
              
              set({ 
                user: newProfile ? { ...newProfile, email: session.user.email } : { id: session.user.id, email: session.user.email } as any,
                isAuthenticated: true,
              });
            } else {
              if (existingProfile.is_banned) {
                await supabase.auth.signOut();
                set({ user: null, isAuthenticated: false });
                return;
              }
              // Initialize user stats if they don't exist
              try {
                await initializeUserStats(session.user.id);
              } catch (e) {
                console.warn('Skipping stats initialization:', e);
              }
              
              set({ 
                user: { ...existingProfile, email: session.user.email },
                isAuthenticated: true,
              });
            }
          } else if (event === 'SIGNED_OUT') {
            set({ user: null, isAuthenticated: false });
          } else if (event === 'TOKEN_REFRESHED') {
            // Handle token refresh
            if (session?.user) {
              // Update user data if needed
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle();
                
              if (profile) {
                if (profile.is_banned) {
                  await supabase.auth.signOut();
                  set({ user: null, isAuthenticated: false });
                  return;
                }
                set({ user: { ...profile, email: session.user.email } });
              }
            }
          }
        } catch (error) {
          console.error('Auth state change error:', error);
          // Fallback to signed out state on error
          set({ user: null, isAuthenticated: false });
        }
      });
      
      // Start session monitoring
      const cleanupMonitoring = useAuthStore.getState()._startSessionMonitoring();
      
      // Return cleanup function for the monitoring
      return cleanupMonitoring;
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ user: null, isAuthenticated: false });
    }
  },
  
  signIn: async (email: string, password: string) => {
    try {
      // Force online status in development
      const isDevelopment = process.env.NODE_ENV === 'development' || 
                           window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1';
      
      if (isDevelopment) {
        // Force browser to think it's online
        window.dispatchEvent(new Event('online'));
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: true
        });
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();
          
        if (profileError) throw profileError;

        // Initialize user stats if they don't exist
        await initializeUserStats(data.user.id);
          
        set({ 
          user: { ...profile, email: data.user.email },
          isAuthenticated: true,
        });
      }
    } catch (error: any) {
      // Enhanced error handling for network issues
      if (error.message?.includes('Failed to fetch') || 
          error.message?.includes('net::ERR_INTERNET_DISCONNECTED') ||
          error.message?.includes('NetworkError') ||
          !navigator.onLine) {
        throw new Error('No internet connection. Please check your network and try again.');
      }
      
      // Handle specific Supabase errors
      if (error.message?.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password. Please try again.');
      }
      
      
      if (error.message?.includes('Too many requests')) {
        throw new Error('Too many login attempts. Please wait a moment and try again.');
      }
      
      // Generic error fallback
      throw new Error(error.message || 'Failed to sign in. Please try again.');
    }
  },

  signInWithUsername: async (username: string, password: string) => {
    try {
      // Force online status in development
      const isDevelopment = process.env.NODE_ENV === 'development' || 
                           window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1';
      
      if (isDevelopment) {
        // Force browser to think it's online
        window.dispatchEvent(new Event('online'));
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: true
        });
      }

      // First, look up the user by username to get their email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', username)
        .maybeSingle();

      if (profileError || !profile) {
        throw new Error('Invalid username or password. Please try again.');
      }

      // Now use the email to sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password,
      });
      
      if (error) throw error;
      
      if (data.user) {
      const { data: fullProfile, error: fullProfileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
        .maybeSingle();
          
        if (fullProfileError) throw fullProfileError;

        // Initialize user stats if they don't exist
        await initializeUserStats(data.user.id);
          
        set({ 
          user: { ...fullProfile, email: data.user.email },
          isAuthenticated: true,
        });
      }
    } catch (error: any) {
      // Enhanced error handling for network issues
      if (error.message?.includes('Failed to fetch') || 
          error.message?.includes('net::ERR_INTERNET_DISCONNECTED') ||
          error.message?.includes('NetworkError') ||
          !navigator.onLine) {
        throw new Error('No internet connection. Please check your network and try again.');
      }
      
      // Handle specific Supabase errors
      if (error.message?.includes('Invalid login credentials')) {
        throw new Error('Invalid username or password. Please try again.');
      }
      
      
      if (error.message?.includes('Too many requests')) {
        throw new Error('Too many login attempts. Please wait a moment and try again.');
      }
      
      // Generic error fallback
      throw new Error(error.message || 'Failed to sign in. Please try again.');
    }
  },

  signInWithEmailOrUsername: async (emailOrUsername: string, password: string) => {
    try {
      // Force online status in development
      const isDevelopment = process.env.NODE_ENV === 'development' || 
                           window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1';
      
      if (isDevelopment) {
        // Force browser to think it's online
        window.dispatchEvent(new Event('online'));
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: true
        });
      }

      // Check if the input looks like an email (contains @)
      const isEmail = emailOrUsername.includes('@');
      
      let email: string;
      
      if (isEmail) {
        // It's an email, use it directly
        email = emailOrUsername;
      } else {
        // It's a username, look up the email
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', emailOrUsername)
          .maybeSingle();

        if (profileError || !profile) {
          throw new Error('Invalid username or email. Please try again.');
        }
        
        email = profile.email;
      }

      // Try JWT authentication first
      try {
        await useAuthStore.getState().signInWithJWT(email, password);
        return; // Success with JWT, exit early
      } catch (jwtError) {
        console.log('JWT authentication failed, falling back to Supabase:', jwtError);
        // Fall back to Supabase authentication
      }

      // Fallback to Supabase authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      if (data.user) {
      const { data: fullProfile, error: fullProfileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
        .maybeSingle();
          
        if (fullProfileError) throw fullProfileError;

        // Initialize user stats if they don't exist
        await initializeUserStats(data.user.id);
          
        set({ 
          user: { ...fullProfile, email: data.user.email },
          isAuthenticated: true,
        });
      }
    } catch (error: any) {
      // Enhanced error handling for network issues
      if (error.message?.includes('Failed to fetch') || 
          error.message?.includes('net::ERR_INTERNET_DISCONNECTED') ||
          error.message?.includes('NetworkError') ||
          !navigator.onLine) {
        throw new Error('No internet connection. Please check your network and try again.');
      }
      
      // Handle specific Supabase errors
      if (error.message?.includes('Invalid login credentials')) {
        throw new Error('Invalid username or email. Please try again.');
      }
      
      
      if (error.message?.includes('Too many requests')) {
        throw new Error('Too many login attempts. Please wait a moment and try again.');
      }
      
      // Generic error fallback
      throw new Error(error.message || 'Failed to sign in. Please try again.');
    }
  },

  signInWithGoogle: async () => {
    try {
      console.log('Starting Google OAuth sign-in...');
      
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
      
      if (error) {
        console.error('Google OAuth error:', error);
        
        // Handle specific Google OAuth errors
        if (error.message?.includes('provider is not enabled')) {
          throw new Error('Google sign-in is not enabled. Please contact support or use email/password sign-in instead.');
        }
        
        if (error.message?.includes('redirect_uri_mismatch')) {
          throw new Error('Google OAuth configuration error. Please contact support.');
        }
        
        throw error;
      }
      
      console.log('Google OAuth initiated successfully:', data);
    } catch (error: any) {
      console.error('Unexpected error during Google OAuth:', error);
      throw error;
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
      
      if (error) {
        // Handle specific Facebook OAuth errors
        if (error.message?.includes('provider is not enabled')) {
          throw new Error('Facebook sign-in is not available. Please use email/password or Google sign-in instead.');
        }
        throw error;
      }
    } catch (error: any) {
      console.error('Facebook OAuth error:', error);
      throw error;
    }
  },
  
  signUp: async (email: string, password: string, username: string, firstName?: string, lastName?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: null, // Disable email confirmation
        }
      });
      
      if (error) {
        console.error('Auth signup error:', error);
        
        // Handle specific Supabase errors with user-friendly messages
        if (error.message?.includes('User already registered')) {
          throw new Error('An account with this email already exists. Please try signing in instead.');
        }
        
        if (error.message?.includes('Password should be at least')) {
          throw new Error('Password must be at least 6 characters long.');
        }
        
        if (error.message?.includes('Invalid email')) {
          throw new Error('Please enter a valid email address.');
        }
        
        if (error.message?.includes('Password is too weak')) {
          throw new Error('Password is too weak. Please choose a stronger password.');
        }
        
        throw error;
      }
      
      if (data.user) {
        console.log('User created successfully:', data.user.id);
        
        // First check if profile already exists
        const { data: existingProfiles, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle();

        if (checkError) {
          console.error('Error checking existing profile:', checkError);
          throw checkError;
        }

        if (!existingProfiles) {
          console.log('Creating new profile for user:', data.user.id);
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              username: username,
              email: data.user.email || '',
              first_name: firstName || null,
              last_name: lastName || null,
              points: 0,
              role: 'user',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              notification_settings: { push: true, email: true }
            });
            
          if (profileError) {
            console.error('Error creating profile:', profileError);
            throw profileError;
          }

          // Initialize user stats
          await initializeUserStats(data.user.id);
          
          console.log('Profile created successfully');
        } else {
          console.log('Profile already exists for user:', data.user.id);
          // Initialize user stats if they don't exist
          await initializeUserStats(data.user.id);
        }
      }
    } catch (error) {
      console.error('Signup process error:', error);
      throw error;
    }
  },
  
  signOut: async () => {
    try {
      // Try JWT logout first
      try {
        await logoutWithJWT();
      } catch (jwtError) {
        console.warn('JWT logout error:', jwtError);
      }

      // Also try Supabase logout
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Only attempt to sign out if we have a valid session
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.warn('Supabase signOut error:', error);
          // Continue with local cleanup even if Supabase fails
        }
      }
    } catch (error) {
      console.warn('Error during signOut:', error);
      // Continue with local cleanup even if there's an error
    } finally {
      // Always clean up local state
      set({ user: null, isAuthenticated: false });
      
      // Clear any stored session data
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();
      
      // Also clear JWT tokens
      clearTokens();
    }
  },

  // JWT Authentication Methods
  signInWithJWT: async (email: string, password: string) => {
    try {
      const response = await authenticateWithJWT(email, password);
      
      if (response.success) {
        set({ 
          user: response.user,
          isAuthenticated: true,
        });
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error: any) {
      console.error('JWT Authentication error:', error);
      throw new Error(error.message || 'Failed to sign in with JWT');
    }
  },

  refreshJWTToken: async () => {
    try {
      const response = await refreshAccessToken();
      
      if (response) {
        set({ 
          user: response.user,
          isAuthenticated: true,
        });
        return true;
      } else {
        set({ user: null, isAuthenticated: false });
        return false;
      }
    } catch (error) {
      console.error('JWT token refresh error:', error);
      set({ user: null, isAuthenticated: false });
      return false;
    }
  },

  checkJWTAuthentication: () => {
    return isJWTAuthenticated();
  },

  initializeJWT: async () => {
    try {
      // Check if we have stored JWT authentication
      if (isJWTAuthenticated()) {
        // Try to get current user from server
        const user = await getCurrentUser();
        
        if (user) {
          set({ 
            user,
            isAuthenticated: true,
          });
          return;
        }
      }

      // If JWT auth fails, try to refresh token
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        set({ 
          user: refreshed.user,
          isAuthenticated: true,
        });
        return;
      }

      // If all JWT methods fail, clear state
      set({ user: null, isAuthenticated: false });
    } catch (error) {
      console.error('JWT initialization error:', error);
      set({ user: null, isAuthenticated: false });
    }
  },
}));