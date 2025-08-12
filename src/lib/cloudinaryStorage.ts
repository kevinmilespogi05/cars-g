import { cloudinary } from './cloudinary';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_TOTAL_SIZE = MAX_FILE_SIZE * 5; // 50MB for multiple uploads
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const UPLOAD_FOLDER = 'cars-g/reports';

interface UploadError extends Error {
  code: string;
  details?: string;
}

class FileUploadError extends Error implements UploadError {
  code: string;
  details?: string;

  constructor(message: string, code: string, details?: string) {
    super(message);
    this.name = 'FileUploadError';
    this.code = code;
    this.details = details;
  }
}

function validateFile(file: File): void {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new FileUploadError(
      `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      'FILE_TOO_LARGE',
      `File size: ${(file.size / 1024 / 1024).toFixed(2)}MB`
    );
  }

  // Validate file type
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new FileUploadError(
      'Unsupported file type. Please upload a JPEG, PNG, GIF, or WebP image.',
      'INVALID_FILE_TYPE',
      `File type: ${file.type}`
    );
  }
}

async function validateFileContent(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      try {
        // Additional validation could be added here
        // For example, checking image dimensions
        resolve();
      } catch (error) {
        reject(new FileUploadError(
          'Invalid file content',
          'INVALID_CONTENT',
          error instanceof Error ? error.message : undefined
        ));
      }
    };

    reader.onerror = () => {
      reject(new FileUploadError(
        'Failed to read file content',
        'READ_ERROR'
      ));
    };

    reader.readAsArrayBuffer(file);
  });
}

export async function uploadImage(file: File): Promise<string> {
  try {
    // Check if Cloudinary is configured
    if (!cloudinary.isConfigured()) {
      throw new FileUploadError(
        'Cloudinary is not configured. Please check your environment variables.',
        'CLOUDINARY_NOT_CONFIGURED'
      );
    }

    // Validate Cloudinary configuration before attempting upload
    const configValidation = await cloudinary.validateConfiguration();
    if (!configValidation.isValid) {
      throw new FileUploadError(
        `Cloudinary configuration error: ${configValidation.error}`,
        'CLOUDINARY_CONFIG_ERROR'
      );
    }

    // Validate file metadata
    validateFile(file);

    // Validate file content
    await validateFileContent(file);

    // Upload to Cloudinary
    const result = await cloudinary.uploadImage(file, UPLOAD_FOLDER);
    
    // Return the secure URL
    return result.secureUrl;
  } catch (error) {
    console.error('Error in uploadImage:', error);
    
    if (error instanceof FileUploadError) {
      throw error;
    }
    
    throw new FileUploadError(
      'Failed to upload image to Cloudinary',
      'UPLOAD_ERROR',
      error instanceof Error ? error.message : undefined
    );
  }
}

export async function uploadMultipleImages(files: File[]): Promise<string[]> {
  try {
    // Check if Cloudinary is configured
    if (!cloudinary.isConfigured()) {
      throw new FileUploadError(
        'Cloudinary is not configured. Please check your environment variables.',
        'CLOUDINARY_NOT_CONFIGURED'
      );
    }

    // Validate Cloudinary configuration before attempting uploads
    const configValidation = await cloudinary.validateConfiguration();
    if (!configValidation.isValid) {
      throw new FileUploadError(
        `Cloudinary configuration error: ${configValidation.error}`,
        'CLOUDINARY_CONFIG_ERROR'
      );
    }

    // Validate total size
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > MAX_TOTAL_SIZE) {
      throw new FileUploadError(
        `Total file size must be less than ${MAX_TOTAL_SIZE / 1024 / 1024}MB`,
        'TOTAL_SIZE_EXCEEDED',
        `Total size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`
      );
    }

    // Validate and upload each file
    const uploadPromises = files.map(async (file, index) => {
      try {
        return await uploadImage(file);
      } catch (error) {
        throw new FileUploadError(
          `Failed to upload image ${index + 1}`,
          'BATCH_UPLOAD_ERROR',
          error instanceof Error ? error.message : undefined
        );
      }
    });

    const results = await Promise.allSettled(uploadPromises);
    
    const successfulUploads = results
      .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
      .map(result => result.value);
    
    const failedUploads = results
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map(result => result.reason);

    if (failedUploads.length > 0) {
      // If any uploads failed, attempt to clean up successful uploads
      // Note: Cloudinary cleanup would require the public_id, which we don't have here
      // In a production environment, you might want to store the public_id for cleanup
      console.warn('Some uploads failed, but successful uploads cannot be cleaned up without public_id');

      const errorMessages = failedUploads
        .map(error => error instanceof Error ? error.message : 'Unknown error')
        .join(', ');
      
      throw new FileUploadError(
        'Some images failed to upload',
        'PARTIAL_UPLOAD_FAILURE',
        errorMessages
      );
    }

    return successfulUploads;
  } catch (error) {
    console.error('Error in uploadMultipleImages:', error);
    
    if (error instanceof FileUploadError) {
      throw error;
    }
    
    throw new FileUploadError(
      'Failed to upload images',
      'BATCH_ERROR',
      error instanceof Error ? error.message : undefined
    );
  }
}

export async function deleteImage(imageUrl: string): Promise<void> {
  try {
    // Check if Cloudinary is configured
    if (!cloudinary.isConfigured()) {
      throw new FileUploadError(
        'Cloudinary is not configured. Please check your environment variables.',
        'CLOUDINARY_NOT_CONFIGURED'
      );
    }

    // Extract public_id from Cloudinary URL
    // URL format: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/filename.jpg
    const urlParts = imageUrl.split('/');
    const uploadIndex = urlParts.findIndex(part => part === 'upload');
    
    if (uploadIndex === -1 || uploadIndex + 1 >= urlParts.length) {
      throw new FileUploadError(
        'Invalid Cloudinary URL format',
        'INVALID_URL_FORMAT'
      );
    }

    // Get the public_id (everything after upload, excluding version and format)
    const publicIdParts = urlParts.slice(uploadIndex + 2); // Skip version
    const publicId = publicIdParts.join('/').split('.')[0]; // Remove file extension

    if (!publicId) {
      throw new FileUploadError(
        'Could not extract public_id from URL',
        'PUBLIC_ID_EXTRACTION_FAILED'
      );
    }

    // Delete from Cloudinary
    await cloudinary.deleteResource(publicId, 'image');
  } catch (error) {
    console.error('Error in deleteImage:', error);
    
    if (error instanceof FileUploadError) {
      throw error;
    }
    
    throw new FileUploadError(
      'Failed to delete image from Cloudinary',
      'DELETE_ERROR',
      error instanceof Error ? error.message : undefined
    );
  }
}

export async function deleteMultipleImages(imageUrls: string[]): Promise<void> {
  try {
    // Delete each image
    const deletePromises = imageUrls.map(async (url, index) => {
      try {
        return await deleteImage(url);
      } catch (error) {
        console.warn(`Failed to delete image ${index + 1}:`, error);
        // Continue with other deletions even if one fails
        return null;
      }
    });

    await Promise.allSettled(deletePromises);
  } catch (error) {
    console.error('Error in deleteMultipleImages:', error);
    throw new FileUploadError(
      'Failed to delete some images',
      'BATCH_DELETE_ERROR',
      error instanceof Error ? error.message : undefined
    );
  }
} 