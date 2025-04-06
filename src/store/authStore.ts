import { create } from 'zustand';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  
  initialize: async () => {
    try {
      // Get initial session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      if (session?.user) {
        // Fetch the user's profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (profileError) throw profileError;
        
        set({ 
          user: profile,
          isAuthenticated: true,
        });
      }

      // Set up auth state listener
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          if (profileError) throw profileError;
          
          set({ 
            user: profile,
            isAuthenticated: true,
          });
        } else if (event === 'SIGNED_OUT') {
          set({ user: null, isAuthenticated: false });
        }
      });
    } catch (error) {
      console.error('Error initializing auth:', error);
    }
  },
  
  signIn: async (email: string, password: string) => {
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
        
      set({ 
        user: profile,
        isAuthenticated: true,
      });
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
          .eq('id', data.user.id);

        if (checkError) {
          console.error('Error checking existing profile:', checkError);
        }

        if (!existingProfiles || existingProfiles.length === 0) {
          console.log('Creating new profile for user:', data.user.id);
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              username: username,
              points: 0,
              role: 'user',
              created_at: new Date().toISOString()
            });
            
          if (profileError) {
            console.error('Error creating profile:', profileError);
            throw profileError;
          }
          console.log('Profile created successfully');
        } else {
          console.log('Profile already exists for user:', data.user.id);
        }
      }
    } catch (error) {
      console.error('Signup process error:', error);
      throw error;
    }
  },
  
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    set({ user: null, isAuthenticated: false });
  },
}));