import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { Award, MapPin, Star, Edit2, Save, X, Camera, Shield, Bell, Lock, Calendar, Eye } from 'lucide-react';
import { AchievementsPanel } from '../components/AchievementsPanel';
import { AvatarSelector } from '../components/AvatarSelector';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { Report } from '../types';
import { deleteMultipleImages } from '../lib/cloudinaryStorage';
import { ConfirmationDialog } from '../components/ConfirmationDialog';

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
  const navigate = useNavigate();
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
    push: true
  });

  const isOwnProfile = !id || (currentUser && id === currentUser.id);
  const user = isOwnProfile ? currentUser : profileData;
  const [myReports, setMyReports] = useState<Report[]>([]);
  const [loadingMyReports, setLoadingMyReports] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Report | null>(null);

  useEffect(() => {
    if (isOwnProfile) {
      if (currentUser) {
        setEditedUsername(currentUser.username || '');
        fetchUserStats(currentUser.id);
        fetchMyReports(currentUser.id);
      }
    } else if (id) {
      fetchProfile(id);
      fetchUserStats(id);
      fetchMyReports(id);
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

  const fetchMyReports = async (userId: string) => {
    try {
      setLoadingMyReports(true);
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyReports(data || []);
    } catch (error) {
      console.error('Error fetching my reports:', error);
      setMyReports([]);
    } finally {
      setLoadingMyReports(false);
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
                    <AvatarSelector
                      currentAvatar={user?.avatar_url || null}
                      onAvatarChange={handleAvatarChange}
                      userId={user?.id || ''}
                      variant="compact"
                    />
                  ) : (
                    <img
                      src={user?.avatar_url || '/images/default-avatar.png'}
                      alt={user?.username}
                      className="h-24 w-24 rounded-full object-cover border-4 border-white shadow-lg"
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
                        className="text-2xl font-bold bg-white border-2 border-gray-200 rounded-lg px-3 py-1 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-color"
                      />
                      <button
                        onClick={handleSaveProfile}
                        disabled={isUpdating}
                        className="px-3 py-1 rounded-lg bg-primary-color text-white hover:bg-primary-dark transition-colors shadow-sm disabled:opacity-60"
                        aria-label="Save username"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-3 py-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors shadow-sm"
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

        {/* Reports for this profile (own or other user) */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-gray-500" />
              {isOwnProfile ? 'My Reports' : `${user?.username || 'User'}'s Reports`}
            </h3>
          </div>
          {loadingMyReports ? (
            <p className="text-gray-600">Loading reports…</p>
          ) : myReports.length === 0 ? (
            <p className="text-gray-600">No reports yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myReports.map((report) => (
                <div
                  key={report.id}
                  className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/reports/${report.id}`)}
                >
                  {report.images && report.images.length > 0 ? (
                    <div className="h-36 overflow-hidden rounded-t-lg">
                      <img src={report.images[0]} alt={report.title} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-36 bg-gray-100 rounded-t-lg flex items-center justify-center">
                      <MapPin className="h-10 w-10 text-gray-400" />
                    </div>
                  )}
                  <div className="p-4">
                    <h4 className="font-semibold text-gray-900 line-clamp-1">{report.title}</h4>
                    <p className="text-sm text-gray-600 line-clamp-2 mt-1">{report.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 capitalize">
                        {report.status.replace('_', ' ')}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(report.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-3 flex justify-between items-center">
                      {isOwnProfile ? (
                        <button
                          className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 text-sm"
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(report); }}
                        >
                          Delete
                        </button>
                      ) : (
                        <span />
                      )}
                      <button
                        className="inline-flex items-center gap-1 text-primary-color hover:text-primary-dark text-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/reports/${report.id}`);
                        }}
                      >
                        <Eye className="h-4 w-4" /> View
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
              </div>
            </div>
          )}

          {/* Achievements */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Award className="w-5 h-5 mr-2 text-gray-500" />
              Achievements
            </h3>
            <AchievementsPanel userId={user?.id || ''} />
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
      {/* Delete confirmation modal */}
      {deleteTarget && (
        <ConfirmationDialog
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            try {
              const report = deleteTarget;
              if (!report) return;
              if (report.images && report.images.length) {
                await deleteMultipleImages(report.images);
              }
              const { error } = await supabase
                .from('reports')
                .delete()
                .eq('id', report.id)
                .eq('user_id', user?.id || '');
              if (error) throw error;
              setMyReports(prev => prev.filter(r => r.id !== report.id));
            } catch (err) {
              console.error('Error deleting report:', err);
              alert('Failed to delete report.');
            }
          }}
          title="Delete Report?"
          message="This action will permanently delete your report and its images. This cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />
      )}
    </div>
  );
}