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

// Generate OTP
function generateOTP(length = 6) {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send verification email
async function sendVerificationEmail(email, otp) {
  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: #4361ee;
            margin-bottom: 10px;
          }
          .otp-container {
            background-color: #f8f9fa;
            border: 2px dashed #4361ee;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
          }
          .otp-code {
            font-size: 32px;
            font-weight: bold;
            color: #4361ee;
            letter-spacing: 5px;
            margin: 10px 0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 14px;
            color: #666;
            text-align: center;
          }
          .warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
            color: #856404;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🚗 Cars-G</div>
            <h2>Email Verification</h2>
          </div>
          
          <p>Hello!</p>
          
          <p>Thank you for registering with Cars-G. To complete your registration, please use the verification code below:</p>
          
          <div class="otp-container">
            <p><strong>Your verification code is:</strong></p>
            <div class="otp-code">${otp}</div>
            <p><small>This code will expire in 10 minutes</small></p>
          </div>
          
          <div class="warning">
            <strong>⚠️ Important:</strong> Never share this code with anyone. Cars-G will never ask for your verification code via phone, email, or any other method.
          </div>
          
          <p>If you didn't request this verification code, please ignore this email.</p>
          
          <p>Best regards,<br>The Cars-G Team</p>
          
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© 2024 Cars-G. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: EMAIL_SENDER,
      to: email,
      subject: 'Verify Your Email - Cars-G Registration',
      html: htmlContent
    };

    // CRITICAL: Must await email sending in serverless functions
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent successfully:', {
      to: email,
      messageId: result.messageId
    });
    
    return true;
  } catch (error) {
    console.error('❌ Failed to send verification email:', error);
    return false;
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
    const [byUser, byEmail, authUsers, existingPending] = await Promise.all([
      supabase.from('profiles').select('id').eq('username', username).maybeSingle(),
      supabase.from('profiles').select('id').eq('email', email).maybeSingle(),
      supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      supabase.from('pending_registrations').select('id').eq('email', email).maybeSingle()
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

    // If there's an existing pending registration, delete it
    if (existingPending.data) {
      await supabase
        .from('pending_registrations')
        .delete()
        .eq('email', email);
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + (10 * 60 * 1000)).toISOString(); // 10 minutes

    // Store pending registration
    const { error: pendingError } = await supabase
      .from('pending_registrations')
      .insert({
        email,
        username,
        password_hash: password, // Supabase will hash this when creating the user
        phone: phone || null,
        code: otp,
        expires_at: otpExpiresAt
      });

    if (pendingError) {
      console.error('Failed to store pending registration:', pendingError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to process registration', 
        code: 'PENDING_ERROR', 
        details: pendingError.message 
      });
    }

    // CRITICAL: Must await email sending in serverless functions
    const emailSent = await sendVerificationEmail(email, otp);
    
    if (!emailSent) {
      // Clean up pending registration if email fails
      await supabase
        .from('pending_registrations')
        .delete()
        .eq('email', email);
      
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to send verification email', 
        code: 'EMAIL_SEND_ERROR' 
      });
    }

    return res.json({ 
      success: true, 
      message: 'Registration successful! Please check your email for the verification code.',
      email,
      requiresVerification: true
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
