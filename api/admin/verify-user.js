// API endpoint for admin to approve or reject user verification
// This endpoint handles manual verification decisions by admins

import { createClient } from '@supabase/supabase-js';
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
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://cars-g.vercel.app';

if (!BREVO_API_KEY) {
  throw new Error('Missing Brevo API configuration');
}

// Initialize Brevo API
const emailAPI = new TransactionalEmailsApi();
emailAPI.authentications.apiKey.apiKey = BREVO_API_KEY;

// Generate approval email HTML template
function generateApprovalEmailHTML(firstName, username) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Approved - CARS-G</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .success-icon { font-size: 48px; color: #10b981; margin: 20px 0; text-align: center; }
            .button { display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .button:hover { background: #059669; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
            .features { background: #f0f9ff; border: 1px solid #bae6fd; padding: 20px; border-radius: 8px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🎉 Welcome to CARS-G!</h1>
            <p>Your account has been approved</p>
        </div>
        
        <div class="content">
            <div class="success-icon">✅</div>
            <h2>Congratulations, ${firstName}!</h2>
            
            <p>Great news! Your CARS-G account has been successfully verified and approved. You can now access all features of our community safety platform.</p>
            
            <div class="features">
                <h3>🚀 What you can do now:</h3>
                <ul>
                    <li>Submit safety reports and incidents</li>
                    <li>View and respond to community reports</li>
                    <li>Participate in community discussions</li>
                    <li>Earn points and achievements</li>
                    <li>Access exclusive community features</li>
                </ul>
            </div>
            
            <div style="text-align: center;">
                <a href="${FRONTEND_URL}/login" class="button">Access Your Account</a>
            </div>
            
            <p><strong>Your Account Details:</strong></p>
            <ul>
                <li>Username: <strong>@${username}</strong></li>
                <li>Status: <strong>Active</strong></li>
                <li>Verification: <strong>Complete</strong></li>
            </ul>
            
            <p>Thank you for joining our community safety initiative. Together, we can make our neighborhoods safer!</p>
        </div>
        
        <div class="footer">
            <p>This email was sent by CARS-G Community Safety Platform</p>
            <p>If you have any questions, please contact our support team.</p>
        </div>
    </body>
    </html>
  `;
}

// Generate decline email HTML template
function generateDeclineEmailHTML(firstName, reason) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Verification Update - CARS-G</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .notice { background: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .button { display: inline-block; background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .button:hover { background: #b91c1c; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>📋 Account Verification Update</h1>
            <p>CARS-G Community Safety Platform</p>
        </div>
        
        <div class="content">
            <h2>Hello ${firstName},</h2>
            
            <p>Thank you for your interest in joining CARS-G, our community safety platform. After reviewing your verification documents, we were unable to approve your account at this time.</p>
            
            <div class="notice">
                <h3>📝 Reason for Decline:</h3>
                <p>${reason || 'The provided documents did not meet our verification requirements. Please ensure your ID documents are clear, valid, and match the information provided during registration.'}</p>
            </div>
            
            <h3>🔄 What you can do next:</h3>
            <ul>
                <li>Review the rejection reason above</li>
                <li>Ensure your ID documents are clear and valid</li>
                <li>Make sure all information matches your documents</li>
                <li>Submit a new verification request</li>
            </ul>
            
            <div style="text-align: center;">
                <a href="${FRONTEND_URL}/register" class="button">Apply Again</a>
            </div>
            
            <p>We appreciate your understanding and look forward to welcoming you to our community safety initiative once the verification requirements are met.</p>
        </div>
        
        <div class="footer">
            <p>This email was sent by CARS-G Community Safety Platform</p>
            <p>If you have any questions, please contact our support team.</p>
        </div>
    </body>
    </html>
  `;
}

// Send notification email using Brevo
async function sendNotificationEmail(email, firstName, username, type, reason = null) {
  let subject, htmlContent;
  
  if (type === 'approved') {
    subject = '🎉 Welcome to CARS-G! Your account has been approved';
    htmlContent = generateApprovalEmailHTML(firstName, username);
  } else {
    subject = '📋 CARS-G Account Verification Update';
    htmlContent = generateDeclineEmailHTML(firstName, reason);
  }
  
  const message = new SendSmtpEmail();
  message.subject = subject;
  message.htmlContent = htmlContent;
  message.sender = { 
    email: EMAIL_SENDER.split(' <')[1]?.replace('>', '') || 'noreply@cars-g.com', 
    name: EMAIL_SENDER.split(' <')[0] || 'CARS-G' 
  };
  message.to = [{ email: email, name: firstName }];

  try {
    const result = await emailAPI.sendTransacEmail(message);
    console.log(`${type} notification email sent successfully:`, result);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error(`Error sending ${type} notification email:`, error);
    throw new Error(`Failed to send ${type} notification email: ${error.message}`);
  }
}

// Delete ID images from Cloudinary
async function deleteIDImages(frontImageUrl, backImageUrl) {
  const CLOUDINARY_CLOUD_NAME = process.env.VITE_CLOUDINARY_CLOUD_NAME;
  const CLOUDINARY_API_KEY = process.env.VITE_CLOUDINARY_API_KEY;
  const CLOUDINARY_API_SECRET = process.env.VITE_CLOUDINARY_API_SECRET;

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.warn('Cloudinary credentials not configured for image deletion');
    return { success: false, error: 'Cloudinary not configured' };
  }

  try {
    // Extract public IDs from URLs
    const extractPublicId = (url) => {
      const match = url.match(/\/upload\/v\d+\/(.+)\./);
      return match ? match[1] : null;
    };

    const frontPublicId = extractPublicId(frontImageUrl);
    const backPublicId = extractPublicId(backImageUrl);

    const deletePromises = [];

    if (frontPublicId) {
      deletePromises.push(
        fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            public_id: frontPublicId,
            api_key: CLOUDINARY_API_KEY,
            api_secret: CLOUDINARY_API_SECRET
          })
        })
      );
    }

    if (backPublicId) {
      deletePromises.push(
        fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            public_id: backPublicId,
            api_key: CLOUDINARY_API_KEY,
            api_secret: CLOUDINARY_API_SECRET
          })
        })
      );
    }

    if (deletePromises.length > 0) {
      const results = await Promise.all(deletePromises);
      console.log('ID images deleted successfully');
      return { success: true, results };
    }

    return { success: true, message: 'No images to delete' };
  } catch (error) {
    console.error('Error deleting ID images:', error);
    return { success: false, error: error.message };
  }
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { requestId, decision, notes } = req.body || {};

    // Input validation
    if (!requestId || !decision) {
      return res.status(400).json({ 
        success: false, 
        error: 'Request ID and decision are required' 
      });
    }

    if (!['approved', 'declined'].includes(decision)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Decision must be either "approved" or "declined"' 
      });
    }

    // Get the verification request
    const { data: request, error: requestError } = await supabase
      .from('user_verification_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      return res.status(404).json({
        success: false,
        error: 'Verification request not found'
      });
    }

    // Update verification request
    const { error: updateRequestError } = await supabase
      .from('user_verification_requests')
      .update({
        status: decision,
        admin_notes: notes || null,
        processed_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (updateRequestError) {
      console.error('Error updating verification request:', updateRequestError);
      return res.status(500).json({
        success: false,
        error: 'Failed to update verification request'
      });
    }

    // Get user profile for notification
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('email, first_name, username, id_front_image_url, id_back_image_url')
      .eq('id', request.user_id)
      .single();

    if (userError || !userProfile) {
      console.error('Error fetching user profile:', userError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch user profile for notification'
      });
    }

    // Handle approval
    if (decision === 'approved') {
      // Update user profile to active status
      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({
          verification_status: 'active',
          verification_notes: 'Manually verified by admin',
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', request.user_id);

      if (updateProfileError) {
        console.error('Error updating user profile:', updateProfileError);
        return res.status(500).json({
          success: false,
          error: 'Failed to activate user account'
        });
      }

      // Send approval notification email
      try {
        await sendNotificationEmail(
          userProfile.email,
          userProfile.first_name,
          userProfile.username,
          'approved'
        );
        console.log('Approval notification sent successfully');
      } catch (emailError) {
        console.error('Failed to send approval notification:', emailError);
        // Don't fail the request, just log the error
      }

      return res.json({
        success: true,
        message: 'User account approved and activated successfully',
        verificationStatus: 'active',
        emailSent: true
      });
    }

    // Handle decline
    if (decision === 'declined') {
      // Delete ID images from Cloudinary for privacy
      try {
        const deleteResult = await deleteIDImages(
          userProfile.id_front_image_url,
          userProfile.id_back_image_url
        );
        console.log('ID images deletion result:', deleteResult);
      } catch (deleteError) {
        console.error('Failed to delete ID images:', deleteError);
        // Don't fail the request, just log the error
      }

      // Update user profile to declined status and clear image URLs
      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({
          verification_status: 'declined',
          verification_notes: `Declined by admin: ${notes || 'No reason provided'}`,
          id_front_image_url: null,
          id_back_image_url: null,
          verified_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', request.user_id);

      if (updateProfileError) {
        console.error('Error updating user profile:', updateProfileError);
        return res.status(500).json({
          success: false,
          error: 'Failed to update user verification status'
        });
      }

      // Send decline notification email
      try {
        await sendNotificationEmail(
          userProfile.email,
          userProfile.first_name,
          userProfile.username,
          'declined',
          notes
        );
        console.log('Decline notification sent successfully');
      } catch (emailError) {
        console.error('Failed to send rejection notification:', emailError);
        // Don't fail the request, just log the error
      }

      return res.json({
        success: true,
        message: 'User account declined and ID images deleted for privacy',
        verificationStatus: 'declined',
        emailSent: true,
        imagesDeleted: true
      });
    }

  } catch (error) {
    console.error('Admin verification error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}
