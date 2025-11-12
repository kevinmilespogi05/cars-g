import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { sendMail } from '../../server/utils/smtpService.js';
import { setOtpForEmail, getOtpEntry } from '../../server/utils/inMemoryOtpStore.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    const { userId, email } = req.body || {};
    if (!userId && !email) return res.status(400).json({ success: false, error: 'Missing userId or email' });

    // If profile exists, keep existing behavior (store OTP on profile)
    if (userId || email) {
      const q = userId ? supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
                       : supabase.from('profiles').select('*').eq('email', email).maybeSingle();

      const { data: profile, error: pError } = await q;
      if (pError) return res.status(500).json({ success: false, error: 'Database error' });

      if (profile) {
        // Rate limit: don't resend if last send was < 60s ago
        const now = new Date();
        const lastSent = profile.email_otp_sent_at ? new Date(profile.email_otp_sent_at) : null;
        if (lastSent && (now.getTime() - lastSent.getTime()) < 60 * 1000) {
          return res.status(429).json({ success: false, error: 'Please wait before requesting a new code' });
        }

        const otp = generateOTP();
        const otpHash = hashOtp(otp);
        const expiry = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

        // Update profile with new OTP hash and sent_at
        const { error: updateError } = await supabase.from('profiles').update({
          email_otp_hash: otpHash,
          email_otp_expires: expiry,
          email_otp_sent_at: now.toISOString(),
          otp_attempts: 0,
          updated_at: now.toISOString()
        }).eq('id', profile.id);

        if (updateError) {
          console.error('Failed to update profile for OTP resend', updateError);
          return res.status(500).json({ success: false, error: 'Failed to generate new OTP' });
        }

        // Send email via SMTP helper
        try {
          const subject = 'Your CARS-G verification code';
          const html = `
            <div style="font-family: Arial, Helvetica, sans-serif;">
              <p>Hi ${profile.first_name || 'User'},</p>
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

        return res.json({ success: true, message: 'OTP resent' });
      }
    }

    // No profile found -> support email-first flow using in-memory store
    // Rate limit: check if we recently sent
    const existing = getOtpEntry(email);
    const now = new Date();
    if (existing) {
      const lastSent = existing.sentAt ? new Date(existing.sentAt) : null;
      if (lastSent && (now.getTime() - lastSent.getTime()) < 60 * 1000) {
        return res.status(429).json({ success: false, error: 'Please wait before requesting a new code' });
      }
    }

    const otp = generateOTP();
    const otpHash = hashOtp(otp);
    const expiry = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

    // Store in-memory
    setOtpForEmail(email, otpHash, expiry, now.toISOString());

    try {
      const subject = 'Your CARS-G verification code';
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
      console.error('Failed to send OTP email', err);
      return res.status(500).json({ success: false, error: 'Failed to send OTP email' });
    }

    return res.json({ success: true, message: 'OTP resent' });

  } catch (error) {
    console.error('resend-email-otp error', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
