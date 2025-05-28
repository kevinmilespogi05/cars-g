import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { Award, MapPin, Star, Edit2, Save, X, Camera, Shield, Bell, Lock } from 'lucide-react';
import { AvatarSelector } from '../components/AvatarSelector';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';

interface UserStats {
  reports_submitted: number;
  reports_verified: number;
  reports_resolved: number;
}

interface ProfileData {
  id: string;
  username: string;
  avatar_url: string | null;
  role: string;
  points: number;
  created_at: string;
  email?: string;
}

export function Profile() {
  const { id } = useParams();
  const { user: currentUser, setUser } = useAuthStore();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUsername, setEditedUsername] = useState('');
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [userStats, setUserStats] = useState<UserStats>({
    reports_submitted: 0,
    reports_verified: 0,
    reports_resolved: 0
  });
  const [notificationSettings, setNotificationSettings] = useState({
    email: true,
    push: true,
    chat: true
  });

  const isOwnProfile = !id || (currentUser && id === currentUser.id);
  const user = isOwnProfile ? currentUser : profileData;

  useEffect(() => {
    if (isOwnProfile) {
      if (currentUser) {
        setEditedUsername(currentUser.username || '');
        fetchUserStats(currentUser.id);
      }
    } else if (id) {
      fetchProfile(id);
      fetchUserStats(id);
    }
  }, [id, currentUser, isOwnProfile]);

  const fetchProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          avatar_url,
          role,
          points,
          created_at
        `)
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      if (!data) {
        console.error('No profile found for user:', userId);
        return;
      }

      console.log('Fetched profile:', data);
      setProfileData(data);
      
      // Also fetch user stats
      await fetchUserStats(userId);
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    }
  };

  const fetchUserStats = async (userId: string) => {
    try {
      // Fetch reports submitted
      const { count: submittedCount } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Fetch reports verified (reports that have been verified by authorities)
      const { count: verifiedCount } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'in_progress');

      // Fetch reports resolved
      const { count: resolvedCount } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'resolved');

      setUserStats({
        reports_submitted: submittedCount || 0,
        reports_verified: verifiedCount || 0,
        reports_resolved: resolvedCount || 0
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
      setUserStats({
        reports_submitted: 0,
        reports_verified: 0,
        reports_resolved: 0
      });
    }
  };

  const handleAvatarChange = async (newAvatarUrl: string) => {
    if (!user) return;
    
    try {
      setIsUpdating(true);
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: newAvatarUrl })
        .eq('id', user.id);

      if (error) throw error;
      
      // Update local state
      setUser({ ...user, avatar_url: newAvatarUrl });
    } catch (error) {
      console.error('Error updating avatar:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    try {
      setIsUpdating(true);
      const { error } = await supabase
        .from('profiles')
        .update({ username: editedUsername })
        .eq('id', user.id);

      if (error) throw error;
      
      // Update local state
      setUser({ ...user, username: editedUsername });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleNotificationToggle = async (type: keyof typeof notificationSettings) => {
    if (!user) return;
    
    try {
      setIsUpdating(true);
      const newSettings = { ...notificationSettings, [type]: !notificationSettings[type] };
      setNotificationSettings(newSettings);
      
      const { error } = await supabase
        .from('profiles')
        .update({ notification_settings: newSettings })
        .eq('id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating notification settings:', error);
      // Revert the change on error
      setNotificationSettings(prev => ({ ...prev, [type]: !prev[type] }));
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Not available';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Not available';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8"
      >
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-primary-color to-primary-dark h-32"></div>
          <div className="px-6 pb-6 -mt-16">
            <div className="flex items-end justify-between">
              <div className="flex items-end space-x-4">
                <div className="relative">
                  {isOwnProfile ? (
                    <>
                      <AvatarSelector
                        currentAvatar={user?.avatar_url || null}
                        onAvatarChange={handleAvatarChange}
                        userId={user?.id || ''}
                      />
                      <button
                        className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-md hover:bg-gray-100 transition-colors"
                        onClick={() => document.getElementById('avatar-upload')?.click()}
                        aria-label="Change profile picture"
                      >
                        <Camera className="w-4 h-4 text-gray-600" />
                      </button>
                    </>
                  ) : (
                    <img
                      src={user?.avatar_url || '/images/default-avatar.png'}
                      alt={user?.username}
                      className="h-20 w-20 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                  )}
                </div>
                <div>
                  {isOwnProfile && isEditing ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={editedUsername}
                        onChange={(e) => setEditedUsername(e.target.value)}
                        className="text-2xl font-bold bg-gray-50 border border-gray-300 rounded px-2 py-1"
                      />
                      <button
                        onClick={handleSaveProfile}
                        disabled={isUpdating}
                        className="p-1 rounded-full bg-primary-color text-white hover:bg-primary-dark transition-colors"
                        aria-label="Save username"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="p-1 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors"
                        aria-label="Cancel editing"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <h2 className="text-2xl font-bold text-gray-900">{user?.username || 'Not set'}</h2>
                      {isOwnProfile && (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                          aria-label="Edit username"
                        >
                          <Edit2 className="w-4 h-4 text-gray-500" />
                        </button>
                      )}
                    </div>
                  )}
                  <p className="text-sm text-gray-600">
                    Member since {formatDate(user?.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {user?.role === 'admin' && (
                  <div className="bg-primary-color/20 text-primary-dark px-3 py-1 rounded-full text-sm font-medium">
                    {user.role}
                  </div>
                )}
                <div className="bg-primary-color/20 text-primary-dark px-3 py-1 rounded-full text-sm font-medium">
                  {user?.points || 0} Points
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Sections */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Account Settings - Only show for own profile */}
          {isOwnProfile && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Lock className="w-5 h-5 mr-2 text-gray-500" />
                Account Settings
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-gray-900">{user?.email || 'Not set'}</p>
                </div>
                {user?.role === 'admin' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Account Type</label>
                    <p className="mt-1 text-gray-900 capitalize">{user.role}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notification Settings - Only show for own profile */}
          {isOwnProfile && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Bell className="w-5 h-5 mr-2 text-gray-500" />
                Notification Settings
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email Notifications</label>
                    <p className="text-sm text-gray-600">Receive updates via email</p>
                  </div>
                  <button
                    onClick={() => handleNotificationToggle('email')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      notificationSettings.email ? 'bg-primary-color' : 'bg-gray-200'
                    }`}
                    aria-label={`${notificationSettings.email ? 'Disable' : 'Enable'} email notifications`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notificationSettings.email ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Push Notifications</label>
                    <p className="text-sm text-gray-600">Receive push notifications</p>
                  </div>
                  <button
                    onClick={() => handleNotificationToggle('push')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      notificationSettings.push ? 'bg-primary-color' : 'bg-gray-200'
                    }`}
                    aria-label={`${notificationSettings.push ? 'Disable' : 'Enable'} push notifications`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notificationSettings.push ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Chat Notifications</label>
                    <p className="text-sm text-gray-600">Receive chat message notifications</p>
                  </div>
                  <button
                    onClick={() => handleNotificationToggle('chat')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      notificationSettings.chat ? 'bg-primary-color' : 'bg-gray-200'
                    }`}
                    aria-label={`${notificationSettings.chat ? 'Disable' : 'Enable'} chat notifications`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notificationSettings.chat ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Achievements */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Award className="w-5 h-5 mr-2 text-gray-500" />
              Achievements
            </h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-primary-color/10 flex items-center justify-center">
                  <Star className="w-5 h-5 text-primary-color" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">First Report</p>
                  <p className="text-sm text-gray-600">Submitted your first report</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-primary-color/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary-color" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Local Hero</p>
                  <p className="text-sm text-gray-600">Submitted 10 reports in your area</p>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Stats */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-gray-500" />
              Activity Stats
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-2xl font-bold text-primary-dark">{user?.points || 0}</p>
                <p className="text-sm text-gray-600">Total Points</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-2xl font-bold text-primary-dark">{userStats.reports_submitted}</p>
                <p className="text-sm text-gray-600">Reports Submitted</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-2xl font-bold text-primary-dark">{userStats.reports_verified}</p>
                <p className="text-sm text-gray-600">Reports Verified</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-2xl font-bold text-primary-dark">{userStats.reports_resolved}</p>
                <p className="text-sm text-gray-600">Reports Resolved</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}