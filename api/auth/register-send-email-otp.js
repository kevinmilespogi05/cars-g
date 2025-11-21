import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { sendMail } from '../../server/utils/smtpService.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Defer creating client until request time so missing env doesn't throw on import
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
    const { userId, email, firstName } = req.body || {};
    if (!supabase) {
      console.error('Missing Supabase configuration (VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)');
      return res.status(500).json({ success: false, error: 'Server misconfiguration: missing Supabase credentials' });
    }
    if (!userId && !email) return res.status(400).json({ success: false, error: 'Missing userId or email' });

    const q = userId ? supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
                     : supabase.from('profiles').select('*').eq('email', email).maybeSingle();

    const { data: profile, error: pError } = await q;
    if (pError || !profile) return res.status(404).json({ success: false, error: 'Profile not found' });

    // Generate OTP
    const otp = generateOTP();
    const otpHash = hashOtp(otp);
    const now = new Date();
    const expiry = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

    // Update profile with OTP
    const { error: updateError } = await supabase.from('profiles').update({
      email_otp_hash: otpHash,
      email_otp_expires: expiry,
      email_otp_sent_at: now.toISOString(),
      otp_attempts: 0,
      updated_at: now.toISOString()
    }).eq('id', profile.id);

    if (updateError) {
      console.error('Failed to update profile with OTP', updateError);
      return res.status(500).json({ success: false, error: 'Failed to generate OTP' });
    }

    // Send OTP email
    try {
      const subject = 'Your BANTAY SP verification code';
      const html = `
        <div style="font-family: Arial, Helvetica, sans-serif;">
          <p>Hi ${profile.first_name || firstName || 'User'},</p>
          <p>Your verification code is:</p>
          <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">${otp}</div>
          <p>This code expires in 10 minutes.</p>
        </div>
      `;

      await sendMail({ to: profile.email, subject, html });
    } catch (err) {
      console.error('Failed to send OTP email', err);
      return res.status(500).json({ success: false, error: 'Failed to send OTP email' });
    }

    return res.json({ success: true, message: 'OTP sent' });

  } catch (error) {
    console.error('register-send-email-otp error', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
