// Express version of OTP verification endpoint for local development
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Hash OTP for comparison
function hashOTP(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

// Express handler
export default async function handler(req, res) {
  try {
    const { email, otp } = req.body;

    // ========================================
    // STEP 1: VALIDATION
    // ========================================

    if (!email || !otp) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and OTP code are required', 
        code: 'MISSING_FIELDS' 
      });
    }

    // Validate OTP format (6 digits)
    const otpRegex = /^\d{6}$/;
    if (!otpRegex.test(otp)) {
      return res.status(400).json({ 
        success: false, 
        error: 'OTP must be a 6-digit number', 
        code: 'INVALID_OTP_FORMAT' 
      });
    }

    // ========================================
    // STEP 2: FIND USER AND VERIFY OTP
    // ========================================

    // Find user with pending OTP verification
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, email, username, first_name, email_otp_hash, email_otp_expires, verification_status')
      .eq('email', email)
      .eq('verification_status', 'pending_email_otp')
      .single();

    if (userError || !user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found or not in OTP verification status', 
        code: 'USER_NOT_FOUND' 
      });
    }

    // ========================================
    // STEP 3: CHECK OTP EXPIRY
    // ========================================

    const now = new Date();
    const otpExpiry = new Date(user.email_otp_expires);
    
    if (otpExpiry < now) {
      return res.status(400).json({ 
        success: false, 
        error: 'OTP code has expired. Please request a new code.', 
        code: 'OTP_EXPIRED' 
      });
    }

    // ========================================
    // STEP 4: VERIFY OTP CODE
    // ========================================

    const providedOTPHash = hashOTP(otp);
    
    if (providedOTPHash !== user.email_otp_hash) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid OTP code. Please check your email and try again.', 
        code: 'INVALID_OTP' 
      });
    }

    // ========================================
    // STEP 5: UPDATE USER STATUS
    // ========================================

    // Update user status to pending admin approval
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        email_verified: true,
        verification_status: 'pending_admin_approval', // Move to admin approval step
        email_otp: null, // Clear plain OTP
        email_otp_hash: null, // Clear hashed OTP
        email_otp_expires: null, // Clear expiry
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating user verification status:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify OTP code',
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

    // ========================================
    // STEP 6: RETURN SUCCESS RESPONSE
    // ========================================

    return res.json({ 
      success: true, 
      message: 'Email verified successfully! Your account is now pending admin review.',
      data: {
        email: user.email,
        username: user.username,
        nextStep: 'admin_review',
        verificationStatus: 'pending_admin_approval',
        redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pending-review`
      }
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error', 
      code: 'INTERNAL_ERROR' 
    });
  }
}
