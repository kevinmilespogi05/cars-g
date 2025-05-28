import { supabase } from './supabase';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_TOTAL_SIZE = MAX_FILE_SIZE * 3; // 30MB for multiple uploads
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const STORAGE_BUCKET = 'reports';

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
    // Validate file metadata
    validateFile(file);

    // Validate file content
    await validateFileContent(file);

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    // Remove any special characters from filename
    const cleanFileName = `${Date.now()}-${Math.random().toString(36).substring(2)}`.replace(/[^a-zA-Z0-9-]/g, '');
    const fileName = `${cleanFileName}.${fileExt}`;

    // Upload to Supabase storage with clean path
    const { error: uploadError, data } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      
      if (uploadError.message.includes('duplicate')) {
        throw new FileUploadError(
          'A file with this name already exists',
          'DUPLICATE_FILE'
        );
      }
      
      throw new FileUploadError(
        'Failed to upload image',
        'UPLOAD_ERROR',
        uploadError.message
      );
    }

    if (!data?.path) {
      throw new FileUploadError(
        'Upload response missing file path',
        'INVALID_RESPONSE'
      );
    }

    // Get public URL with clean path
    const { data: { publicUrl }, error: urlError } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(data.path);

    if (urlError) {
      throw new FileUploadError(
        'Failed to get public URL',
        'URL_ERROR',
        urlError.message
      );
    }

    return publicUrl;
  } catch (error) {
    console.error('Error in uploadImage:', error);
    
    if (error instanceof FileUploadError) {
      throw error;
    }
    
    throw new FileUploadError(
      'Failed to upload image',
      'UNKNOWN_ERROR',
      error instanceof Error ? error.message : undefined
    );
  }
}

export async function uploadMultipleImages(files: File[]): Promise<string[]> {
  try {
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
      try {
        await Promise.all(
          successfulUploads.map(url => 
            supabase.storage
              .from(STORAGE_BUCKET)
              .remove([url.split('/').pop()!])
          )
        );
      } catch (cleanupError) {
        console.error('Failed to clean up after failed uploads:', cleanupError);
      }

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