// ID image upload service
// This endpoint handles uploading ID images to Supabase storage

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
    // Parse multipart form data
    const formData = await req.formData();
    const frontImage = formData.get('frontImage');
    const backImage = formData.get('backImage');

    if (!frontImage || !backImage) {
      return res.status(400).json({
        success: false,
        error: 'Both front and back images are required'
      });
    }

    // Validate file types
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(frontImage.type) || !allowedTypes.includes(backImage.type)) {
      return res.status(400).json({
        success: false,
        error: 'Only JPEG, PNG, and WebP images are allowed'
      });
    }

    // Validate file sizes (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (frontImage.size > maxSize || backImage.size > maxSize) {
      return res.status(400).json({
        success: false,
        error: 'File size must be less than 5MB'
      });
    }

    // Upload to Cloudinary instead of Supabase storage
    const cloudName = process.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'cars-g-uploads';

    if (!cloudName) {
      return res.status(500).json({
        success: false,
        error: 'Cloudinary not configured'
      });
    }

    // Upload front image to Cloudinary
    const frontFormData = new FormData();
    frontFormData.append('file', frontImage);
    frontFormData.append('upload_preset', uploadPreset);
    frontFormData.append('folder', 'cars-g/id-verification');

    const frontResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: frontFormData,
      }
    );

    if (!frontResponse.ok) {
      console.error('Front image upload error:', await frontResponse.text());
      return res.status(500).json({
        success: false,
        error: 'Failed to upload front image to Cloudinary'
      });
    }

    const frontResult = await frontResponse.json();

    // Upload back image to Cloudinary
    const backFormData = new FormData();
    backFormData.append('file', backImage);
    backFormData.append('upload_preset', uploadPreset);
    backFormData.append('folder', 'cars-g/id-verification');

    const backResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: backFormData,
      }
    );

    if (!backResponse.ok) {
      console.error('Back image upload error:', await backResponse.text());
      return res.status(500).json({
        success: false,
        error: 'Failed to upload back image to Cloudinary'
      });
    }

    const backResult = await backResponse.json();

    return res.json({
      success: true,
      frontImageUrl: frontResult.secure_url,
      backImageUrl: backResult.secure_url,
      message: 'ID images uploaded successfully to Cloudinary'
    });

  } catch (error) {
    console.error('ID image upload error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}