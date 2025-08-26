import React from 'react';
import { create } from 'zustand';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { initializeUserStats, verifyDatabaseSchema, debugDatabaseIssue } from '../lib/initAchievements';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
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
          .single();
          
        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }
        
        if (!profile) {
          // Create profile for new user
          const { error: createError } = await supabase
            .from('profiles')
            .insert({
              id: session.user.id,
              username: session.user.email?.split('@')[0] || 'user',
              email: session.user.email || '',
              points: 0,
              role: 'user',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              avatar_url: session.user.user_metadata.avatar_url || null,
              notification_settings: { push: true, email: true }
            });
            
          if (createError) throw createError;

          // Initialize user stats
          await debugDatabaseIssue();
          await verifyDatabaseSchema();
          await initializeUserStats(session.user.id);
          
          // Fetch the newly created profile
          const { data: newProfile, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          if (fetchError) throw fetchError;
          
          set({ 
            user: { ...newProfile, email: session.user.email },
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
          await debugDatabaseIssue();
          await verifyDatabaseSchema();
          await initializeUserStats(session.user.id);
          
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
              .single();
              
            if (profileError && profileError.code !== 'PGRST116') {
              throw profileError;
            }
            
            if (!existingProfile) {
              // Create profile for new user
              const { error: createError } = await supabase
                .from('profiles')
                .insert({
                  id: session.user.id,
                  username: session.user.email?.split('@')[0] || 'user',
                  email: session.user.email || '',
                  points: 0,
                  role: 'user',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  avatar_url: session.user.user_metadata.avatar_url || null,
                  notification_settings: { push: true, email: true }
                });
                
              if (createError) throw createError;

              // Initialize user stats
              await debugDatabaseIssue();
              await verifyDatabaseSchema();
              await initializeUserStats(session.user.id);
              
              // Fetch the newly created profile
              const { data: newProfile, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
                
              if (fetchError) throw fetchError;
              
              set({ 
                user: { ...newProfile, email: session.user.email },
                isAuthenticated: true,
              });
            } else {
              if (existingProfile.is_banned) {
                await supabase.auth.signOut();
                set({ user: null, isAuthenticated: false });
                return;
              }
              // Initialize user stats if they don't exist
              await initializeUserStats(session.user.id);
              
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
                .single();
                
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
          .single();
          
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
      
      if (error.message?.includes('Email not confirmed')) {
        throw new Error('Please check your email and confirm your account before signing in.');
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
  
  signUp: async (email: string, password: string, username: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        console.error('Auth signup error:', error);
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
      // First check if we have a valid session
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
    }
  },
}));