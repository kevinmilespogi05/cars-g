// ID image upload service
// This endpoint handles uploading ID images to Cloudinary

import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

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
    // Parse multipart form data using formidable
    const form = formidable({
      maxFileSize: 5 * 1024 * 1024, // 5MB limit
      filter: ({ mimetype }) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        return allowedTypes.includes(mimetype);
      }
    });

    const [fields, files] = await form.parse(req);
    const frontImage = files.frontImage?.[0];
    const backImage = files.backImage?.[0];

    if (!frontImage || !backImage) {
      return res.status(400).json({
        success: false,
        error: 'Both front and back images are required'
      });
    }

    // Validate file types (already done by formidable filter, but double-check)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(frontImage.mimetype) || !allowedTypes.includes(backImage.mimetype)) {
      return res.status(400).json({
        success: false,
        error: 'Only JPEG, PNG, and WebP images are allowed'
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
    const frontFileStream = fs.createReadStream(frontImage.filepath);
    frontFormData.append('file', frontFileStream);
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
      const errorText = await frontResponse.text();
      console.error('Front image upload error:', errorText);
      return res.status(500).json({
        success: false,
        error: 'Failed to upload front image to Cloudinary',
        details: errorText
      });
    }

    const frontResult = await frontResponse.json();

    // Upload back image to Cloudinary
    const backFormData = new FormData();
    const backFileStream = fs.createReadStream(backImage.filepath);
    backFormData.append('file', backFileStream);
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
      const errorText = await backResponse.text();
      console.error('Back image upload error:', errorText);
      return res.status(500).json({
        success: false,
        error: 'Failed to upload back image to Cloudinary',
        details: errorText
      });
    }

    const backResult = await backResponse.json();

    // Clean up temporary files
    try {
      if (frontImage.filepath) {
        fs.unlinkSync(frontImage.filepath);
      }
      if (backImage.filepath) {
        fs.unlinkSync(backImage.filepath);
      }
    } catch (cleanupError) {
      console.warn('Error cleaning up temporary files:', cleanupError);
    }

    return res.json({
      success: true,
      frontImageUrl: frontResult.secure_url,
      backImageUrl: backResult.secure_url,
      message: 'ID images uploaded successfully to Cloudinary'
    });

  } catch (error) {
    console.error('ID image upload error:', error);
    
    // Clean up temporary files on error
    try {
      if (frontImage?.filepath) {
        fs.unlinkSync(frontImage.filepath);
      }
      if (backImage?.filepath) {
        fs.unlinkSync(backImage.filepath);
      }
    } catch (cleanupError) {
      console.warn('Error cleaning up temporary files:', cleanupError);
    }
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}