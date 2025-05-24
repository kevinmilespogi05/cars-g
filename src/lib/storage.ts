import { supabase } from './supabase';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const STORAGE_BUCKET = 'reports';

export async function uploadImage(file: File): Promise<string> {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  // Validate file type
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error('File type not supported. Please upload a JPEG, PNG, GIF, or WebP image.');
  }

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    // Upload directly to the bucket root
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      if (uploadError.message.includes('duplicate')) {
        throw new Error('A file with this name already exists. Please try again.');
      }
      throw new Error('Failed to upload image. Please try again.');
    }

    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Error in uploadImage:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unexpected error occurred. Please try again.');
  }
}

export async function uploadMultipleImages(files: File[]): Promise<string[]> {
  // Validate total size
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > MAX_FILE_SIZE * 3) { // Allow up to 3 files of max size
    throw new Error(`Total file size must be less than ${(MAX_FILE_SIZE * 3) / 1024 / 1024}MB`);
  }

  try {
    const uploadPromises = files.map(file => uploadImage(file));
    const results = await Promise.allSettled(uploadPromises);
    
    const successfulUploads = results
      .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
      .map(result => result.value);
    
    const failedUploads = results
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map(result => result.reason);

    if (failedUploads.length > 0) {
      console.error('Some images failed to upload:', failedUploads);
      const errorMessages = failedUploads
        .map(error => error instanceof Error ? error.message : 'Unknown error')
        .join(', ');
      throw new Error(`Failed to upload images: ${errorMessages}`);
    }

    return successfulUploads;
  } catch (error) {
    console.error('Error in uploadMultipleImages:', error);
    throw error;
  }
} 