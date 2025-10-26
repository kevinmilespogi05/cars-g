// Vercel serverless function for ID document upload
// Step 3: ID document upload for admin verification

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    const { 
      userId, 
      idFrontImageUrl, 
      idBackImageUrl 
    } = req.body;

    // ========================================
    // STEP 1: VALIDATION
    // ========================================

    if (!userId || !idFrontImageUrl || !idBackImageUrl) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID and both ID image URLs are required', 
        code: 'MISSING_FIELDS' 
      });
    }

    // Validate image URLs (basic URL format check)
    const urlRegex = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i;
    if (!urlRegex.test(idFrontImageUrl) || !urlRegex.test(idBackImageUrl)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid image URL format. Please upload valid image files.', 
        code: 'INVALID_IMAGE_URL' 
      });
    }

    // ========================================
    // STEP 2: VERIFY USER STATUS
    // ========================================

    // Check if user exists and is in the correct verification status
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, email, username, verification_status, email_verified')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found', 
        code: 'USER_NOT_FOUND' 
      });
    }

    // Verify user is in the correct status for ID upload
    if (user.verification_status !== 'pending_admin_approval') {
      return res.status(400).json({ 
        success: false, 
        error: 'User is not in the correct verification status for ID upload', 
        code: 'INVALID_VERIFICATION_STATUS',
        currentStatus: user.verification_status
      });
    }

    if (!user.email_verified) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email must be verified before uploading ID documents', 
        code: 'EMAIL_NOT_VERIFIED' 
      });
    }

    // ========================================
    // STEP 3: UPDATE USER WITH ID IMAGES
    // ========================================

    // Update user profile with ID image URLs
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        id_front_image_url: idFrontImageUrl,
        id_back_image_url: idBackImageUrl,
        verification_status: 'pending', // Move to pending admin review
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user with ID images:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to upload ID documents',
        code: 'UPDATE_ERROR'
      });
    }

    // ========================================
    // STEP 4: CREATE VERIFICATION REQUEST
    // ========================================

    // The database trigger should automatically create a verification request
    // But let's also manually create one to ensure it exists
    const { data: verificationRequest, error: requestError } = await supabase
      .from('user_verification_requests')
      .insert({
        user_id: userId,
        id_front_image_url: idFrontImageUrl,
        id_back_image_url: idBackImageUrl,
        status: 'pending'
      })
      .select()
      .single();

    if (requestError) {
      console.error('Error creating verification request:', requestError);
      // Don't fail the request, just log the error
      // The trigger should have created it automatically
    }

    // ========================================
    // STEP 5: RETURN SUCCESS RESPONSE
    // ========================================

    return res.json({ 
      success: true, 
      message: 'ID documents uploaded successfully! Your account is now pending admin review.',
      data: {
        userId: user.id,
        email: user.email,
        username: user.username,
        verificationStatus: 'pending',
        nextStep: 'admin_review',
        requestId: verificationRequest?.id
      }
    });

  } catch (error) {
    console.error('ID upload error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error', 
      code: 'INTERNAL_ERROR' 
    });
  }
}
