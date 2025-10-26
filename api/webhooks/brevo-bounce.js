// Brevo webhook handler for email bounces
// Scenario C: Handle hard bounces to automatically delete invalid email accounts

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Brevo webhook secret for verification
const BREVO_WEBHOOK_SECRET = process.env.BREVO_WEBHOOK_SECRET;

// Verify webhook signature
function verifyWebhookSignature(payload, signature, secret) {
  if (!secret) {
    console.warn('Brevo webhook secret not configured, skipping signature verification');
    return true; // Allow in development
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

// Handle hard bounce
async function handleHardBounce(bouncedEmail) {
  try {
    console.log(`📧 Processing hard bounce for email: ${bouncedEmail}`);

    // Find user with this email and pending email verification
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, email, username, first_name, created_at')
      .eq('email', bouncedEmail)
      .eq('verification_status', 'pending_email_verification')
      .single();

    if (userError || !user) {
      console.log(`ℹ️ No pending user found for bounced email: ${bouncedEmail}`);
      return { success: true, message: 'No user found for bounced email' };
    }

    console.log(`🗑️ Deleting account for bounced email: ${bouncedEmail}`, {
      userId: user.id,
      username: user.username,
      created_at: user.created_at
    });

    // Delete from Supabase Auth
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(user.id);
    
    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError);
      // Continue with profile deletion even if auth deletion fails
    } else {
      console.log('✅ Auth user deleted successfully');
    }

    // Delete from profiles table
    const { error: profileDeleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id);

    if (profileDeleteError) {
      console.error('Error deleting profile:', profileDeleteError);
      return { success: false, error: profileDeleteError.message };
    }

    console.log('✅ Profile deleted successfully');

    return {
      success: true,
      message: 'Account deleted due to hard bounce',
      deletedUser: {
        id: user.id,
        email: user.email,
        username: user.username,
        created_at: user.created_at
      }
    };

  } catch (error) {
    console.error('Error handling hard bounce:', error);
    return { success: false, error: error.message };
  }
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Brevo-Signature');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const payload = JSON.stringify(req.body);
    const signature = req.headers['x-brevo-signature'] || req.headers['X-Brevo-Signature'];

    // Verify webhook signature
    if (!verifyWebhookSignature(payload, signature, BREVO_WEBHOOK_SECRET)) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid webhook signature' 
      });
    }

    const webhookData = req.body;

    // Log webhook data for debugging
    console.log('📨 Brevo webhook received:', {
      type: webhookData.type,
      event: webhookData.event,
      email: webhookData.email,
      timestamp: new Date().toISOString()
    });

    // Handle different webhook types
    switch (webhookData.type) {
      case 'hard_bounce':
        console.log('🚫 Hard bounce detected');
        const bounceResult = await handleHardBounce(webhookData.email);
        
        if (bounceResult.success) {
          return res.json({
            success: true,
            message: 'Hard bounce processed successfully',
            deletedUser: bounceResult.deletedUser
          });
        } else {
          return res.status(500).json({
            success: false,
            error: 'Failed to process hard bounce',
            details: bounceResult.error
          });
        }

      case 'soft_bounce':
        console.log('⚠️ Soft bounce detected - no action taken');
        return res.json({
          success: true,
          message: 'Soft bounce received - no action taken'
        });

      case 'spam':
        console.log('🚫 Spam complaint detected');
        // Could implement spam handling here if needed
        return res.json({
          success: true,
          message: 'Spam complaint received'
        });

      case 'unsubscribe':
        console.log('📤 Unsubscribe event detected');
        // Could implement unsubscribe handling here if needed
        return res.json({
          success: true,
          message: 'Unsubscribe event received'
        });

      default:
        console.log(`ℹ️ Unhandled webhook type: ${webhookData.type}`);
        return res.json({
          success: true,
          message: `Webhook type ${webhookData.type} received but not handled`
        });
    }

  } catch (error) {
    console.error('Webhook handler error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message
    });
  }
}
