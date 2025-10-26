// Vercel serverless function for secure ID document upload
// Step 3: ID document upload with Cloudinary secure storage

import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import { Readable } from 'stream';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = process.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'cars-g-uploads';

if (!CLOUDINARY_CLOUD_NAME) {
  throw new Error('Missing Cloudinary configuration');
}

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 2 // Maximum 2 files
  },
  fileFilter: (req, file, cb) => {
    // Validate file types
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
    }
  }
});

// Upload to Cloudinary
async function uploadToCloudinary(file, folder, filename) {
  const formData = new FormData();
  const blob = new Blob([file.buffer], { type: file.mimetype });
  formData.append('file', blob, filename);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', folder);
  formData.append('transformation', 'f_auto,q_auto'); // Auto format and quality optimization

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudinary upload failed: ${errorText}`);
  }

  return await response.json();
}

// Validate file security
function validateFileSecurity(file) {
  // Check file size
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File size must be less than 5MB');
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error('Only JPEG, PNG, and WebP images are allowed');
  }

  // Check for suspicious file names
  const suspiciousPatterns = /\.(exe|bat|cmd|scr|pif|vbs|js|jar|php|asp|aspx|jsp)$/i;
  if (suspiciousPatterns.test(file.originalname)) {
    throw new Error('File type not allowed for security reasons');
  }

  // Check file content (basic validation)
  if (file.buffer.length < 100) {
    throw new Error('File appears to be corrupted or too small');
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
    // Parse multipart form data
    const uploadFields = upload.fields([
      { name: 'frontIdImage', maxCount: 1 },
      { name: 'backIdImage', maxCount: 1 }
    ]);

    await new Promise((resolve, reject) => {
      uploadFields(req, res, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    const { frontIdImage, backIdImage } = req.files;
    const { userId } = req.body;

    // ========================================
    // STEP 1: VALIDATION
    // ========================================

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID is required', 
        code: 'MISSING_USER_ID' 
      });
    }

    if (!frontIdImage || !backIdImage) {
      return res.status(400).json({ 
        success: false, 
        error: 'Both front and back ID images are required', 
        code: 'MISSING_IMAGES' 
      });
    }

    // Validate user exists and is in correct status
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
    // STEP 2: FILE SECURITY VALIDATION
    // ========================================

    try {
      validateFileSecurity(frontIdImage[0]);
      validateFileSecurity(backIdImage[0]);
    } catch (validationError) {
      return res.status(400).json({ 
        success: false, 
        error: validationError.message, 
        code: 'FILE_VALIDATION_ERROR' 
      });
    }

    // ========================================
    // STEP 3: SECURE FILE UPLOAD TO CLOUDINARY
    // ========================================

    const timestamp = Date.now();
    const userIdShort = userId.substring(0, 8);
    
    // Generate secure filenames
    const frontFilename = `id-front-${userIdShort}-${timestamp}.${frontIdImage[0].mimetype.split('/')[1]}`;
    const backFilename = `id-back-${userIdShort}-${timestamp}.${backIdImage[0].mimetype.split('/')[1]}`;

    console.log('🔒 Starting secure ID document upload...', {
      userId: userIdShort,
      frontFile: frontFilename,
      backFile: backFilename,
      frontSize: frontIdImage[0].size,
      backSize: backIdImage[0].size
    });

    // Upload front ID image
    let frontResult;
    try {
      frontResult = await uploadToCloudinary(
        frontIdImage[0], 
        'cars-g/id-verification', 
        frontFilename
      );
      console.log('✅ Front ID uploaded successfully:', frontResult.public_id);
    } catch (error) {
      console.error('❌ Front ID upload failed:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to upload front ID image',
        code: 'FRONT_UPLOAD_ERROR'
      });
    }

    // Upload back ID image
    let backResult;
    try {
      backResult = await uploadToCloudinary(
        backIdImage[0], 
        'cars-g/id-verification', 
        backFilename
      );
      console.log('✅ Back ID uploaded successfully:', backResult.public_id);
    } catch (error) {
      console.error('❌ Back ID upload failed:', error);
      
      // Clean up front image if back upload fails
      try {
        await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            public_id: frontResult.public_id,
            api_key: process.env.VITE_CLOUDINARY_API_KEY,
            api_secret: process.env.VITE_CLOUDINARY_API_SECRET
          })
        });
      } catch (cleanupError) {
        console.error('Failed to cleanup front image:', cleanupError);
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to upload back ID image',
        code: 'BACK_UPLOAD_ERROR'
      });
    }

    // ========================================
    // STEP 4: UPDATE USER PROFILE
    // ========================================

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        id_front_image_url: frontResult.secure_url,
        id_back_image_url: backResult.secure_url,
        verification_status: 'pending', // Move to pending admin review
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user profile:', updateError);
      
      // Clean up uploaded images
      try {
        await Promise.all([
          fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              public_id: frontResult.public_id,
              api_key: process.env.VITE_CLOUDINARY_API_KEY,
              api_secret: process.env.VITE_CLOUDINARY_API_SECRET
            })
          }),
          fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              public_id: backResult.public_id,
              api_key: process.env.VITE_CLOUDINARY_API_KEY,
              api_secret: process.env.VITE_CLOUDINARY_API_SECRET
            })
          })
        ]);
      } catch (cleanupError) {
        console.error('Failed to cleanup images:', cleanupError);
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to update user profile',
        code: 'PROFILE_UPDATE_ERROR'
      });
    }

    // ========================================
    // STEP 5: CREATE VERIFICATION REQUEST
    // ========================================

    // The database trigger should automatically create a verification request
    // But let's also manually create one to ensure it exists
    const { data: verificationRequest, error: requestError } = await supabase
      .from('user_verification_requests')
      .insert({
        user_id: userId,
        id_front_image_url: frontResult.secure_url,
        id_back_image_url: backResult.secure_url,
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
    // STEP 6: RETURN SUCCESS RESPONSE
    // ========================================

    console.log('🎉 ID document upload completed successfully', {
      userId: userIdShort,
      frontUrl: frontResult.secure_url,
      backUrl: backResult.secure_url,
      requestId: verificationRequest?.id
    });

    return res.json({ 
      success: true, 
      message: 'ID documents uploaded successfully! Your account is now pending admin review.',
      data: {
        userId: user.id,
        email: user.email,
        username: user.username,
        verificationStatus: 'pending',
        nextStep: 'admin_review',
        requestId: verificationRequest?.id,
        uploadedImages: {
          front: {
            url: frontResult.secure_url,
            publicId: frontResult.public_id,
            size: frontResult.bytes
          },
          back: {
            url: backResult.secure_url,
            publicId: backResult.public_id,
            size: backResult.bytes
          }
        }
      }
    });

  } catch (error) {
    console.error('ID document upload error:', error);
    
    // Handle multer errors
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File size too large. Maximum size is 5MB.',
        code: 'FILE_TOO_LARGE'
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files. Please upload exactly 2 images.',
        code: 'TOO_MANY_FILES'
      });
    }

    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error', 
      code: 'INTERNAL_ERROR' 
    });
  }
}

// Configure the API route to handle multipart form data
export const config = {
  api: {
    bodyParser: false,
  },
};
