// ID image upload service
// This endpoint handles uploading ID images to Cloudinary

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
    console.log('📤 ID image upload request received');
    console.log('Content-Type:', req.headers['content-type']);
    
    // Parse multipart form data manually
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('multipart/form-data')) {
      console.error('❌ Invalid content type:', contentType);
      return res.status(400).json({
        success: false,
        error: 'Content-Type must be multipart/form-data'
      });
    }

    // Get the raw body
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    console.log('📦 Received buffer size:', buffer.length);
    
    // Parse the multipart data manually
    const boundary = contentType.split('boundary=')[1];
    console.log('🔍 Boundary:', boundary);
    const parts = buffer.toString('binary').split(`--${boundary}`);
    console.log('📋 Found parts:', parts.length);
    
    const files = {};
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part.includes('Content-Disposition: form-data')) {
        const nameMatch = part.match(/name="([^"]+)"/);
        const filenameMatch = part.match(/filename="([^"]+)"/);
        const contentTypeMatch = part.match(/Content-Type: ([^\r\n]+)/);
        
        if (nameMatch && filenameMatch) {
          const name = nameMatch[1];
          const filename = filenameMatch[1];
          const contentType = contentTypeMatch ? contentTypeMatch[1] : 'application/octet-stream';
          
          console.log(`📁 Found file: ${name} (${filename}) - ${contentType}`);
          
          // Extract the file data (skip headers)
          const headerEnd = part.indexOf('\r\n\r\n');
          if (headerEnd !== -1) {
            const fileData = part.substring(headerEnd + 4);
            const fileBuffer = Buffer.from(fileData, 'binary');
            
            files[name] = {
              filename,
              contentType,
              buffer: fileBuffer,
              size: fileBuffer.length
            };
            
            console.log(`✅ Parsed file ${name}: ${fileBuffer.length} bytes`);
          }
        }
      }
    }
    
    console.log('📋 Parsed files:', Object.keys(files));
    const frontImage = files.frontImage;
    const backImage = files.backImage;

    if (!frontImage || !backImage) {
      return res.status(400).json({
        success: false,
        error: 'Both front and back images are required'
      });
    }

    // Validate file types
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(frontImage.contentType) || !allowedTypes.includes(backImage.contentType)) {
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
    console.log('☁️ Uploading front image to Cloudinary...');
    const frontFormData = new FormData();
    const frontBlob = new Blob([frontImage.buffer], { type: frontImage.contentType });
    frontFormData.append('file', frontBlob, frontImage.filename);
    frontFormData.append('upload_preset', uploadPreset);
    frontFormData.append('folder', 'cars-g/id-verification');

    console.log('📤 Front image upload details:', {
      cloudName,
      uploadPreset,
      filename: frontImage.filename,
      size: frontImage.size,
      contentType: frontImage.contentType
    });

    const frontResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: frontFormData,
      }
    );

    if (!frontResponse.ok) {
      const errorText = await frontResponse.text();
      console.error('❌ Front image upload error:', errorText);
      return res.status(500).json({
        success: false,
        error: 'Failed to upload front image to Cloudinary',
        details: errorText
      });
    }

    const frontResult = await frontResponse.json();
    console.log('✅ Front image uploaded successfully:', frontResult.public_id);

    // Upload back image to Cloudinary
    console.log('☁️ Uploading back image to Cloudinary...');
    const backFormData = new FormData();
    const backBlob = new Blob([backImage.buffer], { type: backImage.contentType });
    backFormData.append('file', backBlob, backImage.filename);
    backFormData.append('upload_preset', uploadPreset);
    backFormData.append('folder', 'cars-g/id-verification');

    console.log('📤 Back image upload details:', {
      cloudName,
      uploadPreset,
      filename: backImage.filename,
      size: backImage.size,
      contentType: backImage.contentType
    });

    const backResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: backFormData,
      }
    );

    if (!backResponse.ok) {
      const errorText = await backResponse.text();
      console.error('❌ Back image upload error:', errorText);
      return res.status(500).json({
        success: false,
        error: 'Failed to upload back image to Cloudinary',
        details: errorText
      });
    }

    const backResult = await backResponse.json();
    console.log('✅ Back image uploaded successfully:', backResult.public_id);

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
      error: 'Internal server error',
      details: error.message
    });
  }
}