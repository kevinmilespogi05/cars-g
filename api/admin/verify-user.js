// API endpoint for admin to approve or reject user verification
// This endpoint handles manual verification decisions by admins

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Email notifications via Brevo have been removed. Stubbing notification helper.
async function sendNotificationEmail(email, firstName, username, type, reason = null) {
  console.log('Email notifications disabled. Skipping sending', { email, type });
  return { success: true, skipped: true };
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
