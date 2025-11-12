import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { getOtpEntry, incrementAttempts, clearOtp } from '../../server/utils/inMemoryOtpStore.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function hashOtp(otp) {
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { userId, email, otp } = req.body || {};
    if ((!userId && !email) || !otp) {
      return res.status(400).json({ success: false, error: 'Missing userId/email or otp' });
    }

    // If userId provided, prefer profile-backed OTP; otherwise check in-memory store by email
    if (userId) {
      const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('id, email, email_otp_hash, email_otp_expires, otp_attempts')
        .eq('id', userId)
        .single();

      if (pError || !profile) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const now = new Date();
      const expires = profile.email_otp_expires ? new Date(profile.email_otp_expires) : null;

      if (!profile.email_otp_hash || !expires) {
        return res.status(400).json({ success: false, error: 'No OTP pending for this user' });
      }

      if (expires && now > expires) {
        return res.status(410).json({ success: false, error: 'OTP expired' });
      }

      // throttle attempts
      const attempts = (profile.otp_attempts || 0) + 1;
      if (attempts > 5) {
        return res.status(429).json({ success: false, error: 'Too many attempts' });
      }

      const otpHash = hashOtp(otp);
      if (otpHash !== profile.email_otp_hash) {
        // increment attempts
        await supabase.from('profiles').update({ otp_attempts: attempts }).eq('id', userId);
        return res.status(400).json({ success: false, error: 'Invalid OTP' });
      }

      // success: mark verified and clear OTP fields
      await supabase.from('profiles').update({
        email_verified: true,
        verification_status: 'active',
        email_otp_hash: null,
        email_otp_expires: null,
        otp_attempts: 0,
        updated_at: new Date().toISOString()
      }).eq('id', userId);

      return res.json({ success: true, message: 'Email verified' });
    }

    // email-based verification (in-memory store)
    const entry = getOtpEntry(email);
    if (!entry) {
      return res.status(404).json({ success: false, error: 'No OTP pending for this email' });
    }

    const now = new Date();
    const expires = entry.expires ? new Date(entry.expires) : null;
    if (expires && now > expires) {
      clearOtp(email);
      return res.status(410).json({ success: false, error: 'OTP expired' });
    }

    const attempts = incrementAttempts(email);
    if (attempts > 5) {
      return res.status(429).json({ success: false, error: 'Too many attempts' });
    }

    const otpHash = hashOtp(otp);
    if (otpHash !== entry.hash) {
      return res.status(400).json({ success: false, error: 'Invalid OTP' });
    }

    // success: clear in-memory OTP
    clearOtp(email);
    return res.json({ success: true, message: 'Email verified' });

  } catch (error) {
    console.error('verify-email-otp error', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
