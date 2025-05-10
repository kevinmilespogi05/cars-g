import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { Award, MapPin, Star, Edit2, Save, X, Camera, Shield, Bell, Lock } from 'lucide-react';
import { AvatarSelector } from '../components/AvatarSelector';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';

interface UserStats {
  reports_submitted: number;
  reports_verified: number;
  reports_resolved: number;
}

export function Profile() {
  const { user, setUser } = useAuthStore();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUsername, setEditedUsername] = useState('');
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

  useEffect(() => {
    if (user) {
      setEditedUsername(user.username || '');
      fetchUserStats();
    }
  }, [user]);

  const fetchUserStats = async () => {
    if (!user?.id) return;

    try {
      // Fetch reports submitted
      const { count: submittedCount } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Fetch reports verified (reports that have been verified by authorities)
      const { count: verifiedCount } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'in_progress');

      // Fetch reports resolved
      const { count: resolvedCount } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'resolved');

      setUserStats({
        reports_submitted: submittedCount || 0,
        reports_verified: verifiedCount || 0,
        reports_resolved: resolvedCount || 0
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
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
                  <AvatarSelector
                    currentAvatar={user?.avatar_url || null}
                    onAvatarChange={handleAvatarChange}
                    userId={user?.id || ''}
                  />
                  <button
                    className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-md hover:bg-gray-100 transition-colors"
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                  >
                    <Camera className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
                <div>
                  {isEditing ? (
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
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="p-1 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <h2 className="text-2xl font-bold text-gray-900">{user?.username || 'Not set'}</h2>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                      >
                        <Edit2 className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  )}
                  <p className="text-sm text-gray-500">Member since {new Date(user?.created_at || '').toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {user?.role === 'admin' && (
                  <div className="bg-primary-color/10 text-primary-color px-3 py-1 rounded-full text-sm font-medium">
                    {user.role}
                  </div>
                )}
                <div className="bg-primary-color/10 text-primary-color px-3 py-1 rounded-full text-sm font-medium">
                  {user?.points || 0} Points
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Sections */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Account Settings */}
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

          {/* Notification Settings */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Bell className="w-5 h-5 mr-2 text-gray-500" />
              Notification Settings
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email Notifications</label>
                  <p className="text-sm text-gray-500">Receive updates via email</p>
                </div>
                <button
                  onClick={() => handleNotificationToggle('email')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notificationSettings.email ? 'bg-primary-color' : 'bg-gray-200'
                  }`}
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
                  <p className="text-sm text-gray-500">Receive push notifications</p>
                </div>
                <button
                  onClick={() => handleNotificationToggle('push')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notificationSettings.push ? 'bg-primary-color' : 'bg-gray-200'
                  }`}
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
                  <p className="text-sm text-gray-500">Receive chat message notifications</p>
                </div>
                <button
                  onClick={() => handleNotificationToggle('chat')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notificationSettings.chat ? 'bg-primary-color' : 'bg-gray-200'
                  }`}
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
                  <p className="text-sm text-gray-500">Submitted your first report</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-primary-color/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary-color" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Local Hero</p>
                  <p className="text-sm text-gray-500">Submitted 10 reports in your area</p>
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
                <p className="text-2xl font-bold text-primary-color">{user?.points || 0}</p>
                <p className="text-sm text-gray-500">Total Points</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-2xl font-bold text-primary-color">{userStats.reports_submitted}</p>
                <p className="text-sm text-gray-500">Reports Submitted</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-2xl font-bold text-primary-color">{userStats.reports_verified}</p>
                <p className="text-sm text-gray-500">Reports Verified</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-2xl font-bold text-primary-color">{userStats.reports_resolved}</p>
                <p className="text-sm text-gray-500">Reports Resolved</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}