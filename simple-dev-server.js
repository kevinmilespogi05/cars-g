#!/usr/bin/env node

// Simple development server for testing OTP endpoints
import express from 'express';
import cors from 'cors';
import { validateEmail } from './server/utils/emailValidation.js';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Simple OTP Development Server Running',
    timestamp: new Date().toISOString()
  });
});

// Simple registration endpoint
app.post('/api/auth/register-otp', (req, res) => {
  console.log('📝 Registration request received:', req.body);
  
  const { firstName, lastName, email, username, password, confirmPassword, acceptTerms } = req.body;
  
  // Basic validation
  if (!firstName || !lastName || !email || !username || !password || !confirmPassword) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      code: 'MISSING_FIELDS'
    });
  }
  
  if (password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      error: 'Password and confirm password do not match',
      code: 'PASSWORD_MISMATCH'
    });
  }
  
  const emailValidation = validateEmail(email, true);
  if (!emailValidation.isValid) {
    return res.status(400).json({
      success: false,
      error: emailValidation.error,
      code: 'INVALID_EMAIL_DOMAIN'
    });
  }
  
  if (!acceptTerms) {
    return res.status(400).json({
      success: false,
      error: 'You must accept the Privacy Policy and Terms of Service',
      code: 'TERMS_NOT_ACCEPTED'
    });
  }
  
  // Generate mock OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  res.json({
    success: true,
    message: 'Registration successful! Please check your Gmail for the verification code.',
    data: {
      email,
      username,
      verificationStatus: 'pending_email_otp',
      nextStep: 'email_otp_verification',
      emailSent: true,
      devOTP: otp,
      message: 'This is a mock response for development testing'
    }
  });
});

// Simple OTP verification endpoint
app.post('/api/auth/verify-otp', (req, res) => {
  console.log('🔐 OTP verification request received:', req.body);
  
  const { email, otp } = req.body;
  
  if (!email || !otp) {
    return res.status(400).json({
      success: false,
      error: 'Email and OTP code are required',
      code: 'MISSING_FIELDS'
    });
  }
  
  // Mock verification (accept any 6-digit OTP)
  if (otp.length === 6 && /^\d{6}$/.test(otp)) {
    res.json({
      success: true,
      message: 'Email verified successfully! Your account is now pending admin review.',
      data: {
        email,
        nextStep: 'admin_review',
        verificationStatus: 'pending_admin_approval',
        redirectUrl: 'http://localhost:3000/pending-review'
      }
    });
  } else {
    res.status(400).json({
      success: false,
      error: 'Invalid OTP code. Please check your email and try again.',
      code: 'INVALID_OTP'
    });
  }
});

// Simple resend OTP endpoint
app.post('/api/auth/resend-otp', (req, res) => {
  console.log('📧 Resend OTP request received:', req.body);
  
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'Email is required',
      code: 'MISSING_EMAIL'
    });
  }
  
  if (!email.toLowerCase().endsWith('@gmail.com')) {
    return res.status(400).json({
      success: false,
      error: 'Only Gmail addresses are allowed',
      code: 'INVALID_EMAIL_DOMAIN'
    });
  }
  
  // Generate new mock OTP
  const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
  
  res.json({
    success: true,
    message: 'New verification code sent to your Gmail.',
    data: {
      email,
      emailSent: true,
      devOTP: newOtp,
      message: 'This is a mock response for development testing'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Simple OTP Development Server running on http://localhost:${PORT}`);
  console.log(`📧 Test endpoints:`);
  console.log(`   GET  http://localhost:${PORT}/api/health`);
  console.log(`   POST http://localhost:${PORT}/api/auth/register-otp`);
  console.log(`   POST http://localhost:${PORT}/api/auth/verify-otp`);
  console.log(`   POST http://localhost:${PORT}/api/auth/resend-otp`);
  console.log(`\n🧪 Run tests with:`);
  console.log(`   node simple-test.js`);
});
