import React, { useState } from 'react';
import { User, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';

const DEFAULT_AVATARS = [
  '/avatars/avatar1.png',
  '/avatars/avatar2.png',
  '/avatars/avatar3.png',
  '/avatars/avatar4.png',
  '/avatars/avatar5.png',
];

interface AvatarSelectorProps {
  currentAvatar: string | null;
  onAvatarChange: (avatarUrl: string) => void;
  userId: string;
}

export function AvatarSelector({ currentAvatar, onAvatarChange, userId }: AvatarSelectorProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [showDefaultAvatars, setShowDefaultAvatars] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setIsUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      // Upload image to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      onAvatarChange(publicUrl);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Failed to upload avatar. Please try again.');
    } finally {
      setIsUploading(false);
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
            htmlFor="avatar-upload"
            className="absolute bottom-0 right-0 bg-white rounded-full p-1.5 shadow-lg cursor-pointer hover:bg-gray-50"
          >
            <Upload className="h-4 w-4 text-gray-600" />
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
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
          {DEFAULT_AVATARS.map((avatar) => (
            <button
              key={avatar}
              onClick={() => handleDefaultAvatarSelect(avatar)}
              className={`p-1 rounded-lg border-2 ${
                currentAvatar === avatar ? 'border-blue-500' : 'border-transparent'
              } hover:border-gray-300`}
            >
              <img
                src={avatar}
                alt="Default avatar"
                className="w-full h-auto rounded-full"
              />
            </button>
          ))}
        </div>
      )}

      {isUploading && (
        <div className="text-sm text-gray-500">
          Uploading...
        </div>
      )}
    </div>
  );
} 