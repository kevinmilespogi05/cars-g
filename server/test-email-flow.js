// Quick end-to-end test for the email-first OTP flow (dev only).
// This script will:
// 1. Monkey-patch the SMTP helper to capture the sent email HTML
// 2. Invoke the start-email-verification handler with a test email
// 3. Extract the 6-digit OTP from the captured email
// 4. Invoke the verify-email-otp handler with the extracted OTP
// Usage: node server/test-email-flow.js

import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_EMAIL = process.env.TEST_TO || '202210346@gordoncollege.edu.ph';

async function run() {
  console.log('Starting email-first OTP flow test for:', TEST_EMAIL);

  // Load .env from the server folder (so SMTP credentials are available)
  const dotenv = await import('dotenv');
  dotenv.config({ path: path.join(__dirname, '.env') });

  // We'll generate OTP locally, store it in in-memory store, send the email, then call verify
  const crypto = await import('crypto');
  const smtpMod = await import(pathToFileURL(path.resolve(__dirname, './utils/smtpService.js')).href);
  const storeMod = await import(pathToFileURL(path.resolve(__dirname, './utils/inMemoryOtpStore.js')).href);
  // Ensure SUPABASE env vars exist so verify-email-otp module doesn't throw on import
  process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost';
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-service-key';
  const verifyMod = await import(pathToFileURL(path.resolve(__dirname, '../api/auth/verify-email-otp.js')).href);

  function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  function hashOtp(otp) {
    return crypto.createHash('sha256').update(String(otp)).digest('hex');
  }

  try {
    const otp = generateOTP();
    const otpHash = hashOtp(otp);
    const now = new Date();
    const expiry = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

    // Store hashed OTP in in-memory store
    storeMod.setOtpForEmail(TEST_EMAIL, otpHash, expiry, now.toISOString());
    console.log('Stored OTP hash for', TEST_EMAIL);

    // Send email using smtp helper
    const subject = 'Your CARS-G verification code (test)';
    const html = `\n      <div style="font-family: Arial, Helvetica, sans-serif;">\n        <p>Hi,</p>\n        <p>Your verification code is:</p>\n        <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">${otp}</div>\n        <p>This code expires in 10 minutes.</p>\n      </div>\n    `;
    console.log('Sending email (may take a second)...');
    const info = await smtpMod.sendMail({ to: TEST_EMAIL, subject, html });
    console.log('SMTP send result:', info && info.accepted ? { accepted: info.accepted, rejected: info.rejected, response: info.response } : info);

    // Now call verify handler
    function makeRes() {
      const r = {};
      r.headers = {};
      r.setHeader = (k, v) => { r.headers[k] = v; };
      r.status = (code) => { r.statusCode = code; return r; };
      r.json = (obj) => { r._json = obj; return obj; };
      r.end = () => {};
      return r;
    }

    const vReq = { method: 'POST', body: { email: TEST_EMAIL, otp } };
    const vRes = makeRes();
    console.log('Calling verify-email-otp...');
    await verifyMod.default(vReq, vRes);
    console.log('verify response:', vRes.statusCode || 200, vRes._json || 'OK');

  } catch (err) {
    console.error('Test flow failed:', err);
    process.exitCode = 1;
  }
}

run();
