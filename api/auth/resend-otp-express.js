// Express version of resend OTP endpoint for local development
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { TransactionalEmailsApi, SendSmtpEmail } from '@getbrevo/brevo';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Brevo API configuration
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const EMAIL_SENDER = process.env.EMAIL_SENDER || 'CARS-G <noreply@cars-g.com>';

if (!BREVO_API_KEY) {
  throw new Error('Missing Brevo API configuration');
}

// Initialize Brevo API
const emailAPI = new TransactionalEmailsApi();
emailAPI.authentications.apiKey.apiKey = BREVO_API_KEY;

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Hash OTP for secure storage
function hashOTP(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

// Calculate OTP expiry time (10 minutes from now)
function getOTPExpiry() {
  const now = new Date();
  const expiry = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes
  return expiry.toISOString();
}

// Generate OTP email HTML template
function generateOTPEmailHTML(firstName, otp) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Verification Code - CARS-G</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-code { background: #f0f9ff; border: 2px solid #0ea5e9; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
            .otp-number { font-size: 32px; font-weight: bold; color: #0ea5e9; letter-spacing: 4px; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
            .security-notice { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🚗 CARS-G</h1>
            <p>New Verification Code</p>
        </div>
        
        <div class="content">
            <h2>Hi ${firstName}!</h2>
            
            <p>You requested a new verification code for your CARS-G account. Here's your new code:</p>
            
            <div class="otp-code">
                <h3>Your New Verification Code</h3>
                <div class="otp-number">${otp}</div>
                <p style="margin: 10px 0 0 0; color: #666;">This code will expire in 10 minutes</p>
            </div>
            
            <div class="security-notice">
                <strong>🔒 Security Notice:</strong> This verification code will expire in 10 minutes for your security. If you didn't request this code, please ignore this email.
            </div>
            
            <p><strong>What's next?</strong></p>
            <ul>
                <li>Enter this code in the verification form</li>
                <li>Your account will be reviewed by our admin team</li>
                <li>You'll receive notification once approved</li>
            </ul>
        </div>
        
        <div class="footer">
            <p>This email was sent by CARS-G Community Safety Platform</p>
            <p>If you have any questions, please contact our support team.</p>
        </div>
    </body>
    </html>
  `;
}

// Send OTP email using Brevo
async function sendOTPEmail(email, firstName, otp) {
  const message = new SendSmtpEmail();
  message.subject = 'New Verification Code - CARS-G Community Safety';
  message.htmlContent = generateOTPEmailHTML(firstName, otp);
  message.sender = { 
    email: EMAIL_SENDER.split(' <')[1]?.replace('>', '') || 'noreply@cars-g.com', 
    name: EMAIL_SENDER.split(' <')[0] || 'CARS-G' 
  };
  message.to = [{ email: email, name: firstName }];

  try {
    const result = await emailAPI.sendTransacEmail(message);
    console.log('Resend OTP email sent successfully:', result);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending resend OTP email:', error);
    throw new Error(`Failed to send OTP email: ${error.message}`);
  }
}

// Express handler
export default async function handler(req, res) {
  try {
    const { email } = req.body;

    // ========================================
    // STEP 1: VALIDATION
    // ========================================

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email is required', 
        code: 'MISSING_EMAIL' 
      });
    }

    // Validate Gmail domain
    if (!email.toLowerCase().endsWith('@gmail.com')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Only Gmail addresses are allowed', 
        code: 'INVALID_EMAIL_DOMAIN' 
      });
    }

    // ========================================
    // STEP 2: FIND USER
    // ========================================

    // Find user with pending OTP verification
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, email, username, first_name, email_otp_expires, verification_status')
      .eq('email', email)
      .eq('verification_status', 'pending_email_otp')
      .single();

    if (userError || !user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found or not in OTP verification status', 
        code: 'USER_NOT_FOUND' 
      });
    }

    // ========================================
    // STEP 3: CHECK COOLDOWN (Optional)
    // ========================================

    // Check if user has requested a new OTP recently (within 1 minute)
    const now = new Date();
    const lastOTPExpiry = new Date(user.email_otp_expires);
    const timeSinceLastOTP = now.getTime() - lastOTPExpiry.getTime();
    const oneMinute = 60 * 1000; // 1 minute in milliseconds

    if (timeSinceLastOTP < oneMinute) {
      return res.status(429).json({ 
        success: false, 
        error: 'Please wait before requesting a new code. Try again in a moment.', 
        code: 'RATE_LIMITED' 
      });
    }

    // ========================================
    // STEP 4: GENERATE NEW OTP
    // ========================================

    const newOTP = generateOTP();
    const newOTPHash = hashOTP(newOTP);
    const newOTPExpiry = getOTPExpiry();

    // Update user with new OTP
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        email_otp: newOTP,
        email_otp_hash: newOTPHash,
        email_otp_expires: newOTPExpiry,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating OTP:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate new OTP',
        code: 'UPDATE_ERROR'
      });
    }

    // ========================================
    // STEP 5: SEND NEW OTP EMAIL
    // ========================================

    try {
      const emailResult = await sendOTPEmail(email, user.first_name, newOTP);

      return res.json({ 
        success: true, 
        message: 'New verification code sent to your Gmail.',
        data: {
          email: user.email,
          otpExpiry: newOTPExpiry,
          emailSent: true,
          messageId: emailResult.messageId,
          // For development testing, include the OTP in response
          devOTP: newOTP
        }
      });

    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      
      return res.status(500).json({
        success: false,
        error: 'Failed to send new verification code',
        code: 'EMAIL_SEND_ERROR',
        details: emailError.message,
        // For development testing, include the OTP in response
        devOTP: newOTP
      });
    }

  } catch (error) {
    console.error('Resend OTP error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error', 
      code: 'INTERNAL_ERROR' 
    });
  }
}
