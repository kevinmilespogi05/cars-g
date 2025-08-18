import React, { useState } from 'react';
import { User, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';

const DEFAULT_AVATARS = [
  '/avatars/avatar1.svg',
  '/avatars/avatar2.svg',
  '/avatars/avatar3.svg',
  '/avatars/avatar4.svg',
  '/avatars/avatar5.svg',
];

interface AvatarSelectorProps {
  currentAvatar: string | null;
  onAvatarChange: (avatarUrl: string) => void;
  userId: string;
  variant?: 'full' | 'compact';
}

// Allowed MIME types for avatar uploads
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp'
];

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function AvatarSelector({ currentAvatar, onAvatarChange, userId, variant = 'full' }: AvatarSelectorProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [showDefaultAvatars, setShowDefaultAvatars] = useState(false);
  const inputId = `avatar-upload-${userId || 'me'}`;

  // Validate file before upload
  const validateFile = (file: File): string | null => {
    console.log('Validating file:', { name: file.name, type: file.type, size: file.size });
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`;
    }

    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return `File type ${file.type} is not supported. Please use: ${ALLOWED_MIME_TYPES.join(', ')}`;
    }

    // Check file extension
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    if (!fileExt || !allowedExtensions.includes(fileExt)) {
      return `File extension .${fileExt} is not supported. Please use: ${allowedExtensions.join(', ')}`;
    }

    return null; // File is valid
  };

  // Create a new file with correct MIME type using Blob
  const createCorrectFile = async (file: File): Promise<File> => {
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    
    // Map file extensions to correct MIME types
    const mimeTypeMap: { [key: string]: string } = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp'
    };

    const correctMimeType = fileExt ? mimeTypeMap[fileExt] : 'image/jpeg';
    
    console.log(`Creating new file with MIME type: ${correctMimeType}`);
    
    // Read the file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Create a new blob with the correct MIME type
    const blob = new Blob([arrayBuffer], { type: correctMimeType });
    
    // Create a new file from the blob
    const newFile = new File([blob], file.name, {
      type: correctMimeType,
      lastModified: file.lastModified
    });
    
    console.log('New file created:', {
      name: newFile.name,
      type: newFile.type,
      size: newFile.size
    });
    
    return newFile;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setIsUploading(true);
      const file = event.target.files?.[0];
      if (!file) {
        console.log('No file selected');
        return;
      }

      console.log('=== FILE UPLOAD DEBUG START ===');
      console.log('Original file:', {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified
      });

      // Create a new file with correct MIME type
      const correctedFile = await createCorrectFile(file);
      
      console.log('Corrected file:', {
        name: correctedFile.name,
        type: correctedFile.type,
        size: correctedFile.size
      });

      // Validate the corrected file
      const validationError = validateFile(correctedFile);
      if (validationError) {
        console.log('Validation error:', validationError);
        alert(validationError);
        return;
      }

      // Create a clean filename with timestamp and random number
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15);
      const fileExt = correctedFile.name.split('.').pop()?.toLowerCase();
      const fileName = `${timestamp}-${random}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      console.log('Upload details:', {
        name: correctedFile.name,
        type: correctedFile.type,
        size: correctedFile.size,
        path: filePath
      });

      // Try to read the file as an array buffer to verify it's actually an image
      const arrayBuffer = await correctedFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Check file signature (magic bytes) to verify it's actually an image
      const isJPEG = uint8Array[0] === 0xFF && uint8Array[1] === 0xD8 && uint8Array[2] === 0xFF;
      const isPNG = uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && uint8Array[2] === 0x4E && uint8Array[3] === 0x47;
      const isGIF = uint8Array[0] === 0x47 && uint8Array[1] === 0x49 && uint8Array[2] === 0x46;
      const isWebP = uint8Array[0] === 0x52 && uint8Array[1] === 0x49 && uint8Array[2] === 0x46 && uint8Array[3] === 0x46;
      
      console.log('File signature check:', { isJPEG, isPNG, isGIF, isWebP });
      
      if (!isJPEG && !isPNG && !isGIF && !isWebP) {
        console.log('File signature validation failed');
        alert('The selected file does not appear to be a valid image. Please select a different file.');
        return;
      }

      console.log('About to upload to Supabase...');

      // Upload image to Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(filePath, correctedFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: correctedFile.type || 'image/jpeg'
        });

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful:', data);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      console.log('Public URL:', publicUrl);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw updateError;
      }

      onAvatarChange(publicUrl);
      console.log('Avatar updated successfully');
      console.log('=== FILE UPLOAD DEBUG END ===');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to upload avatar. Please try again.';
      
      if (error && typeof error === 'object' && 'message' in error) {
        const errorObj = error as any;
        if (errorObj.message?.includes('invalid_mime_type')) {
          errorMessage = 'Invalid file type. Please select a valid image file (JPEG, PNG, GIF, or WebP).';
        } else if (errorObj.message?.includes('file_size')) {
          errorMessage = 'File is too large. Please select an image smaller than 5MB.';
        } else if (errorObj.message?.includes('unauthorized')) {
          errorMessage = 'Upload not authorized. Please try logging in again.';
        } else {
          errorMessage = `Upload failed: ${errorObj.message}`;
        }
      }
      
      alert(errorMessage);
    } finally {
      setIsUploading(false);
      // Clear the input so the same file can be selected again
      event.target.value = '';
    }
  };

  const handleDefaultAvatarSelect = async (avatarUrl: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', userId);

      if (error) throw error;

      onAvatarChange(avatarUrl);
      setShowDefaultAvatars(false);
    } catch (error) {
      console.error('Error updating avatar:', error);
      alert('Failed to update avatar. Please try again.');
    }
  };

  if (variant === 'compact') {
    return (
      <div className="relative inline-block">
        {currentAvatar ? (
          <img
            src={currentAvatar}
            alt="Profile"
            className="h-24 w-24 rounded-full object-cover border-4 border-white shadow-lg"
          />
        ) : (
          <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-white shadow-lg">
            <User className="h-12 w-12 text-gray-400" />
          </div>
        )}
        <label
          htmlFor={inputId}
          className="absolute bottom-1 right-1 bg-white rounded-full p-1.5 shadow-lg cursor-pointer hover:bg-gray-50"
          aria-label="Change profile picture"
        >
          <Upload className="h-4 w-4 text-gray-600" />
          <input
            id={inputId}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={handleFileUpload}
            disabled={isUploading}
          />
        </label>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <div className="relative">
          {currentAvatar ? (
            <img
              src={currentAvatar}
              alt="Profile"
              className="h-24 w-24 rounded-full object-cover"
            />
          ) : (
            <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="h-12 w-12 text-gray-400" />
            </div>
          )}
          <label
            htmlFor={inputId}
            className="absolute bottom-0 right-0 bg-white rounded-full p-1.5 shadow-lg cursor-pointer hover:bg-gray-50"
          >
            <Upload className="h-4 w-4 text-gray-600" />
            <input
              id={inputId}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </label>
        </div>
        <div>
          <h3 className="text-lg font-medium">Profile Picture</h3>
          <p className="text-sm text-gray-500">
            Upload a custom picture or choose from our defaults
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Supported formats: JPEG, PNG, GIF, WebP (max 5MB)
          </p>
          <button
            type="button"
            onClick={() => setShowDefaultAvatars(!showDefaultAvatars)}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
          >
            {showDefaultAvatars ? 'Hide default avatars' : 'Show default avatars'}
          </button>
        </div>
      </div>

      {showDefaultAvatars && (
        <div className="grid grid-cols-5 gap-4 mt-4">
          {DEFAULT_AVATARS.map((avatar, index) => (
            <button
              key={index}
              onClick={() => handleDefaultAvatarSelect(avatar)}
              className="h-16 w-16 rounded-full overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-colors"
            >
              <img
                src={avatar}
                alt={`Default avatar ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {isUploading && (
        <div className="text-sm text-gray-500">
          Uploading avatar...
        </div>
      )}
    </div>
  );
} 