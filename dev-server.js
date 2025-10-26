#!/usr/bin/env node

// Local development server for testing OTP endpoints
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.DEV_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Import OTP endpoints (Express versions)
import registerOTP from './api/auth/register-otp-express.js';
import verifyOTP from './api/auth/verify-otp-express.js';
import resendOTP from './api/auth/resend-otp-express.js';

// API Routes
app.post('/api/auth/register-otp', registerOTP);
app.post('/api/auth/verify-otp', verifyOTP);
app.post('/api/auth/resend-otp', resendOTP);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'OTP Development Server Running',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 OTP Development Server running on http://localhost:${PORT}`);
  console.log(`📧 Test endpoints:`);
  console.log(`   POST http://localhost:${PORT}/api/auth/register-otp`);
  console.log(`   POST http://localhost:${PORT}/api/auth/verify-otp`);
  console.log(`   POST http://localhost:${PORT}/api/auth/resend-otp`);
  console.log(`   GET  http://localhost:${PORT}/api/health`);
  console.log(`\n🧪 Run tests with:`);
  console.log(`   TEST_BASE_URL=http://localhost:${PORT} node run-tests.js`);
});
