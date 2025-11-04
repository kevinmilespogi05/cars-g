// Vercel serverless function for OTP-based user registration
// Step 1: Initial Registration with OTP generation and email sending

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { TransactionalEmailsApi, SendSmtpEmail } from '@getbrevo/brevo';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Brevo API configuration
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const EMAIL_SENDER = process.env.EMAIL_SENDER || 'CARS-G <noreply@cars-g.com>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://cars-g.vercel.app';

if (!BREVO_API_KEY) {
  throw new Error('Missing Brevo API configuration');
}

// Initialize Brevo API
const emailAPI = new TransactionalEmailsApi();
emailAPI.authentications.apiKey.apiKey = BREVO_API_KEY;

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Hash OTP for secure storage
function hashOTP(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

// Calculate OTP expiry time (10 minutes from now)
function getOTPExpiry() {
  const now = new Date();
  const expiry = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes
  return expiry.toISOString();
}

// Generate OTP email HTML template
function generateOTPEmailHTML(firstName, otp) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - CARS-G</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-code { background: #f0f9ff; border: 2px solid #0ea5e9; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
            .otp-number { font-size: 32px; font-weight: bold; color: #0ea5e9; letter-spacing: 4px; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
            .security-notice { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🚗 Welcome to CARS-G!</h1>
            <p>Community Safety Platform</p>
        </div>
        
        <div class="content">
            <h2>Hi ${firstName}!</h2>
            
            <p>Thank you for registering with CARS-G, your community safety platform. To complete your registration, please verify your email address using the code below.</p>
            
            <div class="otp-code">
                <h3>Your Verification Code</h3>
                <div class="otp-number">${otp}</div>
                <p style="margin: 10px 0 0 0; color: #666;">This code will expire in 10 minutes</p>
            </div>
            
            <div class="security-notice">
                <strong>🔒 Security Notice:</strong> This verification code will expire in 10 minutes for your security. If you didn't create an account with CARS-G, please ignore this email.
            </div>
            
            <p><strong>What's next after verification?</strong></p>
            <ul>
                <li>Your account will be reviewed by our admin team</li>
                <li>You'll receive notification once approved</li>
                <li>Start contributing to community safety!</li>
            </ul>
            
            <p>If you didn't request this code, please ignore this email. Your account will not be created without verification.</p>
        </div>
        
        <div class="footer">
            <p>This email was sent by CARS-G Community Safety Platform</p>
            <p>If you have any questions, please contact our support team.</p>
        </div>
    </body>
    </html>
  `;
}

// Send OTP email using Brevo
async function sendOTPEmail(email, firstName, otp) {
  const message = new SendSmtpEmail();
  message.subject = 'Verify Your Email - CARS-G Community Safety';
  message.htmlContent = generateOTPEmailHTML(firstName, otp);
  message.sender = { 
    email: EMAIL_SENDER.split(' <')[1]?.replace('>', '') || 'noreply@cars-g.com', 
    name: EMAIL_SENDER.split(' <')[0] || 'CARS-G' 
  };
  message.to = [{ email: email, name: firstName }];

  try {
    const result = await emailAPI.sendTransacEmail(message);
    console.log('OTP email sent successfully:', result);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error(`Failed to send OTP email: ${error.message}`);
  }
}

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
    const { 
      firstName, 
      lastName, 
      email, 
      username, 
      phone, 
      password, 
      confirmPassword,
      acceptTerms,
      idFrontImageUrl,
      idBackImageUrl
    } = req.body;

    // ========================================
    // STEP 1: COMPREHENSIVE FORM VALIDATION
    // ========================================

    // Check that all required fields are present
    const requiredFields = { firstName, lastName, email, username, password, confirmPassword };
    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !value || value.trim() === '')
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: `Missing required fields: ${missingFields.join(', ')}`, 
        code: 'MISSING_FIELDS',
        missingFields 
      });
    }

    // Validate password and confirmPassword match
    if (password !== confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password and confirm password do not match', 
        code: 'PASSWORD_MISMATCH' 
      });
    }

    // CRITICAL: Validate that email ends with @gmail.com
    if (!email.toLowerCase().endsWith('@gmail.com')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Only Gmail addresses are allowed for registration', 
        code: 'INVALID_EMAIL_DOMAIN' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid email format', 
        code: 'INVALID_EMAIL_FORMAT' 
      });
    }

    // Validate password strength - require strong passwords
    const passwordMinLength = 12;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    if (password.length < passwordMinLength) {
      return res.status(400).json({ 
        success: false, 
        error: `Password must be at least ${passwordMinLength} characters long`, 
        code: 'WEAK_PASSWORD' 
      });
    }
    
    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character', 
        code: 'WEAK_PASSWORD' 
      });
    }

    // Validate username (alphanumeric, 3-20 characters)
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username must be 3-20 characters, alphanumeric and underscores only', 
        code: 'INVALID_USERNAME' 
      });
    }

    // Validate phone number (if provided)
    if (phone && phone.trim() !== '') {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid phone number format', 
          code: 'INVALID_PHONE' 
        });
      }
    }

    // Validate terms acceptance
    if (!acceptTerms) {
      return res.status(400).json({ 
        success: false, 
        error: 'You must accept the Privacy Policy and Terms of Service', 
        code: 'TERMS_NOT_ACCEPTED' 
      });
    }

    // ========================================
    // STEP 2: CHECK FOR EXISTING USERS
    // ========================================

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

    // ========================================
    // STEP 3: GENERATE OTP AND CREATE USER
    // ========================================

    // Generate OTP and hash
    const otp = generateOTP();
    const otpHash = hashOTP(otp);
    const otpExpiry = getOTPExpiry();

    // Create user in Supabase Auth with email confirmation disabled
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: false, // Keep unconfirmed until OTP verification
      user_metadata: {
        username: username,
        first_name: firstName,
        last_name: lastName
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

    // ========================================
    // STEP 4: CREATE PROFILE WITH OTP STATUS
    // ========================================

    // Prepare profile payload with OTP verification status
    const profilePayload = {
      id: authData.user.id,
      email: email,
      username: username,
      first_name: firstName,
      last_name: lastName,
      role: 'user',
      points: 0,
      email_verified: false,
      verification_status: 'pending_email_otp', // New OTP status
      email_otp: otp, // Store plain OTP for email
      email_otp_hash: otpHash, // Store hashed OTP for verification
      email_otp_expires: otpExpiry,
      created_at: new Date().toISOString()
    };

    // Add phone if provided and valid
    if (phone && phone.trim() !== '') {
      profilePayload.phone = phone.trim();
    }

    // Add ID image URLs if provided
    if (idFrontImageUrl && idBackImageUrl) {
      profilePayload.id_front_image_url = idFrontImageUrl;
      profilePayload.id_back_image_url = idBackImageUrl;
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

    // ========================================
    // STEP 5: SEND OTP EMAIL
    // ========================================

    try {
      const emailResult = await sendOTPEmail(email, firstName, otp);

      return res.json({ 
        success: true, 
        message: 'Registration successful! Please check your Gmail for the verification code.',
        data: {
          email,
          username,
          verificationStatus: 'pending_email_otp',
          nextStep: 'email_otp_verification',
          otpExpiry: otpExpiry,
          emailSent: true,
          messageId: emailResult.messageId,
          redirectUrl: `${FRONTEND_URL}/verify-email`
        }
      });

    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      
      // Don't fail the registration, just log the error
      // User can request a new OTP later
      return res.json({ 
        success: true, 
        message: 'Registration successful! Please check your Gmail for the verification code.',
        data: {
          email,
          username,
          verificationStatus: 'pending_email_otp',
          nextStep: 'email_otp_verification',
          otpExpiry: otpExpiry,
          emailSent: false,
          emailError: 'Failed to send verification email. Please request a new code.'
        }
      });
    }

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error', 
      code: 'INTERNAL_ERROR' 
    });
  }
}
