import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Award, MapPin, Star } from 'lucide-react';
import { AvatarSelector } from '../components/AvatarSelector';
import { supabase } from '../lib/supabase';

export function Profile() {
  const { user, setUser } = useAuthStore();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleAvatarChange = async (newAvatarUrl: string) => {
    if (!user) return;
    
    try {
      setIsUpdating(true);
      // Update local state
      setUser({ ...user, avatar_url: newAvatarUrl });
    } catch (error) {
      console.error('Error updating avatar:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Your Profile</h1>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Profile Info */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
            <div className="space-y-4">
              <AvatarSelector
                currentAvatar={user?.avatar_url || null}
                onAvatarChange={handleAvatarChange}
                userId={user?.id || ''}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <p className="mt-1 text-gray-900">{user?.username || 'Not set'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Points</label>
                <p className="mt-1 text-gray-900">{user?.points || 0}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Rank</label>
                <p className="mt-1 text-gray-900">{user?.rank || 'Newcomer'}</p>
              </div>
            </div>
          </div>

          {/* Achievements */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Achievements</h2>
            <div className="space-y-4">
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Award className="h-8 w-8 text-yellow-500" />
                  <div>
                    <h3 className="font-medium">First Report</h3>
                    <p className="text-sm text-gray-600">Submit your first community report</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <MapPin className="h-8 w-8 text-blue-500" />
                  <div>
                    <h3 className="font-medium">Location Expert</h3>
                    <p className="text-sm text-gray-600">Submit reports from 5 different locations</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Star className="h-8 w-8 text-purple-500" />
                  <div>
                    <h3 className="font-medium">Community Champion</h3>
                    <p className="text-sm text-gray-600">Reach 1000 points</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}