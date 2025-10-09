import express from 'express';
import otpGenerator from 'otp-generator';
import sendBrevoOtp from '../utils/sendBrevoOtp.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

// Store OTPs with expiration time
let OTPs = {};

// Function to send OTP via Brevo
const sendOtpEmail = async (email, otp, type = 'general') => {
  return await sendBrevoOtp(email, otp, type);
};

// Route to generate OTP (general purpose)
router.post('/generate-otp', async (req, res) => {
  const { email, type = 'general' } = req.body;

  if (!email) {
    return res.status(400).json({ 
      remarks: 'error', 
      message: 'Email is required' 
    });
  }

  // Generate OTP (6 digits, numeric)
  const otp = otpGenerator.generate(6, { digits: true, upperCase: false, specialChars: false });
  
  // Store OTP with expiration time (10 minutes)
  OTPs[email] = {
    otp,
    expiresAt: Date.now() + (10 * 60 * 1000),
    type
  };

  // Send OTP via email
  const emailSent = await sendOtpEmail(email, otp, type);

  if (!emailSent) {
    return res.status(500).json({ 
      remarks: 'error', 
      message: 'Failed to send OTP email' 
    });
  }

  return res.status(200).json({ 
    remarks: 'success', 
    message: 'OTP sent to your email.' 
  });
});

// Route to verify OTP (general purpose)
router.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ 
      remarks: 'error', 
      message: 'Email and OTP are required.' 
    });
  }

  // Check if OTP exists and is valid
  if (!OTPs[email]) {
    return res.status(400).json({ 
      remarks: 'error', 
      message: 'Invalid or expired OTP.' 
    });
  }

  const otpData = OTPs[email];
  
  // Check if OTP has expired
  if (Date.now() > otpData.expiresAt) {
    delete OTPs[email];
    return res.status(400).json({ 
      remarks: 'error', 
      message: 'OTP has expired. Please request a new one.' 
    });
  }

  // Verify OTP
  if (otpData.otp === otp) {
    delete OTPs[email];  // Clear OTP after successful verification
    return res.status(200).json({ 
      remarks: 'success', 
      message: 'OTP verified successfully.' 
    });
  } else {
    return res.status(400).json({ 
      remarks: 'error', 
      message: 'Invalid OTP.' 
    });
  }
});

// Route to resend OTP
router.post('/resend-otp', async (req, res) => {
  const { email, type = 'general' } = req.body;

  if (!email) {
    return res.status(400).json({ 
      remarks: 'error', 
      message: 'Email is required' 
    });
  }

  // Generate new OTP
  const otp = otpGenerator.generate(6, { digits: true, upperCase: false, specialChars: false });
  
  // Store OTP with expiration time (10 minutes)
  OTPs[email] = {
    otp,
    expiresAt: Date.now() + (10 * 60 * 1000),
    type
  };

  // Send OTP via email
  const emailSent = await sendOtpEmail(email, otp, type);

  if (!emailSent) {
    return res.status(500).json({ 
      remarks: 'error', 
      message: 'Failed to send OTP email' 
    });
  }

  return res.status(200).json({ 
    remarks: 'success', 
    message: 'OTP resent to your email.' 
  });
});

// Cleanup expired OTPs periodically
setInterval(() => {
  const now = Date.now();
  for (const email in OTPs) {
    if (OTPs[email].expiresAt < now) {
      delete OTPs[email];
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

export default router;
