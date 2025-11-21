import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { sendMail } from '../../server/utils/smtpService.js';
import { setOtpForEmail } from '../../server/utils/inMemoryOtpStore.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Defer throwing until request time so imports don't crash serverless environments.
let supabase = null;
if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashOtp(otp) {
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const { email } = req.body || {};
    if (!supabase) {
      console.error('Missing Supabase configuration (VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)');
      return res.status(500).json({ success: false, error: 'Server misconfiguration: missing Supabase credentials' });
    }
    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

    // Check if email already exists in profiles or auth
    const [profileRes, authRes] = await Promise.all([
      supabase.from('profiles').select('id').eq('email', email).maybeSingle(),
      supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
    ]);

    const exists = profileRes.data || authRes.data?.users?.some(u => u.email === email);
    if (exists) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }

    const otp = generateOTP();
    const otpHash = hashOtp(otp);
    const now = new Date();
    const expiry = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

    // Store in in-memory store for verification step
    setOtpForEmail(email, otpHash, expiry, now.toISOString());

    // Send email
    try {
      const subject = 'Your BANTAY SP verification code';
      const html = `
        <div style="font-family: Arial, Helvetica, sans-serif;">
          <p>Hi,</p>
          <p>Your verification code is:</p>
          <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">${otp}</div>
          <p>This code expires in 10 minutes.</p>
        </div>
      `;
      await sendMail({ to: email, subject, html });
    } catch (err) {
      console.error('Failed to send verification email', err);
      return res.status(500).json({ success: false, error: 'Failed to send verification email' });
    }

    return res.json({ success: true, message: 'Verification code sent' });
  } catch (error) {
    console.error('start-email-verification error', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
