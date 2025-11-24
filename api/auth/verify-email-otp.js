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

    // If userId provided, prefer profile-backed OTP
    // If only email provided, try to find profile first, then fall back to in-memory store
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
      const { data: updateData, error: updateError } = await supabase
        .from('profiles')
        .update({
          email_verified: true,
          verification_status: 'active',
          email_otp_hash: null,
          email_otp_expires: null,
          otp_attempts: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select();

      if (updateError) {
        console.error('Error updating profile email_verified:', updateError);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to update email verification status',
          details: updateError.message 
        });
      }

      if (!updateData || updateData.length === 0) {
        console.error('Profile update returned no data for userId:', userId);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to update email verification status - no rows updated' 
        });
      }

      console.log('Successfully updated email_verified for user:', userId);

      // Also update the auth user to mark email as confirmed in Supabase Auth
      try {
        const { error: authUpdateError } = await supabase.auth.admin.updateUserById(userId, {
          email_confirm: true
        });

        if (authUpdateError) {
          console.error('Error updating auth user email confirmation:', authUpdateError);
          // Don't fail the request, just log the error
        } else {
          console.log('Successfully updated Supabase Auth email confirmation for user:', userId);
        }
      } catch (authErr) {
        console.error('Exception updating auth user email confirmation:', authErr);
        // Don't fail the request, just log the error
      }

      return res.json({ success: true, message: 'Email verified' });
    }

    // If only email provided, try to find profile first
    if (email) {
      const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('id, email, email_otp_hash, email_otp_expires, otp_attempts')
        .eq('email', email)
        .maybeSingle();

      if (!pError && profile && profile.email_otp_hash) {
        // Profile exists with OTP - verify using profile
        const now = new Date();
        const expires = profile.email_otp_expires ? new Date(profile.email_otp_expires) : null;

        if (!expires) {
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
          await supabase.from('profiles').update({ otp_attempts: attempts }).eq('id', profile.id);
          return res.status(400).json({ success: false, error: 'Invalid OTP' });
        }

        // success: mark verified and clear OTP fields
        const { data: updateData, error: updateError } = await supabase
          .from('profiles')
          .update({
            email_verified: true,
            verification_status: 'active',
            email_otp_hash: null,
            email_otp_expires: null,
            otp_attempts: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id)
          .select();

        if (updateError) {
          console.error('Error updating profile email_verified:', updateError);
          return res.status(500).json({ 
            success: false, 
            error: 'Failed to update email verification status',
            details: updateError.message 
          });
        }

        if (!updateData || updateData.length === 0) {
          console.error('Profile update returned no data for userId:', profile.id);
          return res.status(500).json({ 
            success: false, 
            error: 'Failed to update email verification status - no rows updated' 
          });
        }

        console.log('Successfully updated email_verified for user:', profile.id);

        // Also update the auth user to mark email as confirmed in Supabase Auth
        try {
          const { error: authUpdateError } = await supabase.auth.admin.updateUserById(profile.id, {
            email_confirm: true
          });

          if (authUpdateError) {
            console.error('Error updating auth user email confirmation:', authUpdateError);
            // Don't fail the request, just log the error
          } else {
            console.log('Successfully updated Supabase Auth email confirmation for user:', profile.id);
          }
        } catch (authErr) {
          console.error('Exception updating auth user email confirmation:', authErr);
          // Don't fail the request, just log the error
        }

        return res.json({ success: true, message: 'Email verified' });
      }
    }

    // email-based verification (in-memory store) - fallback for email-first flow
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
