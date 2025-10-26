// Vercel serverless function for email verification confirmation
// Step 2b: Confirm email verification token and update user status

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ 
        success: false, 
        error: 'Verification token is required', 
        code: 'MISSING_TOKEN' 
      });
    }

    // Find user with matching verification token
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, email, first_name, email_verification_token, email_verification_token_expiry, verification_status')
      .eq('email_verification_token', token)
      .eq('verification_status', 'pending_email_verification')
      .single();

    if (userError || !user) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid or expired verification token', 
        code: 'INVALID_TOKEN' 
      });
    }

    // Check if token is still valid (not expired)
    const now = new Date();
    const tokenExpiry = new Date(user.email_verification_token_expiry);
    
    if (tokenExpiry < now) {
      return res.status(400).json({ 
        success: false, 
        error: 'Verification token has expired. Please request a new verification email.', 
        code: 'TOKEN_EXPIRED' 
      });
    }

    // Update user status to email verified and clear token
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        email_verified: true,
        verification_status: 'pending_id_verification', // Move to next step: ID verification
        email_verification_token: null,
        email_verification_token_expiry: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating user verification status:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to confirm email verification',
        code: 'UPDATE_ERROR'
      });
    }

    // Also update the auth user to mark email as confirmed
    const { error: authUpdateError } = await supabase.auth.admin.updateUserById(user.id, {
      email_confirm: true
    });

    if (authUpdateError) {
      console.error('Error updating auth user email confirmation:', authUpdateError);
      // Don't fail the request, just log the error
    }

    return res.json({ 
      success: true, 
      message: 'Email verified successfully! You can now proceed to upload your ID documents.',
      data: {
        email: user.email,
        username: user.username,
        nextStep: 'id_verification',
        verificationStatus: 'pending_id_verification'
      }
    });

  } catch (error) {
    console.error('Email confirmation error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error', 
      code: 'INTERNAL_ERROR' 
    });
  }
}
