// Vercel serverless function for user registration with email verification
// This is an example of how to implement the registration endpoint for Vercel deployment

import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Gmail configuration
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const EMAIL_SENDER = process.env.EMAIL_SENDER || 'CARS-G <noreply@cars-g.com>';

// Create transporter with production-ready configuration
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Use STARTTLS for production compatibility
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 60000,
  greetingTimeout: 30000,
  socketTimeout: 60000
});

// Note: OTP generation and verification email functions removed
// as Gmail verification is no longer used for registration

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { email, password, username, firstName, lastName, phone } = req.body || {};

    // Input validation
    if (!email || !password || !username) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email, password, and username are required', 
        code: 'MISSING_FIELDS' 
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid email format', 
        code: 'INVALID_EMAIL' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password must be at least 6 characters long', 
        code: 'WEAK_PASSWORD' 
      });
    }

    const alphanumericRegex = /^[a-zA-Z0-9]+$/;
    if (!alphanumericRegex.test(username) || username.length < 3) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid username', 
        code: 'INVALID_USERNAME' 
      });
    }

    // Check if email or username already exists
    const [byUser, byEmail, authUsers] = await Promise.all([
      supabase.from('profiles').select('id').eq('username', username).maybeSingle(),
      supabase.from('profiles').select('id').eq('email', email).maybeSingle(),
      supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
    ]);

    if (byUser.data) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username is already taken', 
        code: 'USERNAME_TAKEN' 
      });
    }

    if (byEmail.data || authUsers.data?.users?.some(u => u.email === email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'An account with this email already exists', 
        code: 'EMAIL_EXISTS' 
      });
    }

    // Create user in Supabase Auth directly
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Mark as confirmed since we're not using email verification
      user_metadata: {
        username: username,
        first_name: firstName || '',
        last_name: lastName || ''
      }
    });

    if (authError || !authData.user) {
      console.error('Auth user creation error:', authError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create user account',
        code: 'AUTH_ERROR'
      });
    }

    // Prepare profile payload
    const profilePayload = {
      id: authData.user.id,
      email: email,
      username: username,
      first_name: firstName || '',
      last_name: lastName || '',
      role: 'user',
      points: 0,
      email_verified: true,
      created_at: new Date().toISOString()
    };

    // Add phone if provided and valid
    if (phone) {
      profilePayload.phone = phone;
    }

    // Create profile in profiles table
    let { error: profileCreateError } = await supabase
      .from('profiles')
      .insert(profilePayload);

    // If phone column doesn't exist, retry without phone
    if (profileCreateError && String(profileCreateError.message || '').includes("'phone'")) {
      const { phone: _omit, ...withoutPhone } = profilePayload;
      const retry = await supabase.from('profiles').insert(withoutPhone);
      profileCreateError = retry.error || null;
    }

    if (profileCreateError) {
      console.error('Profile creation error:', profileCreateError);
      // Clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({
        success: false,
        error: 'Failed to create user profile',
        code: 'PROFILE_ERROR'
      });
    }

    return res.json({ 
      success: true, 
      message: 'Registration successful! You can now sign in.',
      email,
      requiresVerification: false
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error', 
      code: 'INTERNAL_ERROR' 
    });
  }
}
