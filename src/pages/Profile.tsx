import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { Award, MapPin, Star, Edit2, Save, X, Camera, Shield, Bell, Lock, Calendar, Eye, CheckCircle, AlertCircle } from 'lucide-react';
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
  // Patrol-specific stats
  patrol_reports_accepted: number;
  patrol_reports_completed: number;
  patrol_experience_points: number;
  patrol_level: number;
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
    reports_resolved: 0,
    patrol_reports_accepted: 0,
    patrol_reports_completed: 0,
    patrol_experience_points: 0,
    patrol_level: 1
  });
  const [notificationSettings, setNotificationSettings] = useState({
    email: true,
    push: true
  });

  const isOwnProfile = !id || (currentUser && id === currentUser.id);
  const user = isOwnProfile ? currentUser : profileData;
  const [myReports, setMyReports] = useState<Report[]>([]);
  const [myResolvedReports, setMyResolvedReports] = useState<Report[]>([]);
  const [loadingMyReports, setLoadingMyReports] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Report | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
      // Use the achievements system to get comprehensive stats
      const { getUserStatsWithCache } = await import('../lib/achievements');
      const stats = await getUserStatsWithCache(userId);
      
      // Get patrol-specific stats if user is a patrol officer
      let patrolStats = {
        patrol_reports_accepted: 0,
        patrol_reports_completed: 0,
        patrol_experience_points: 0,
        patrol_level: 1
      };

      if (user?.role === 'patrol') {
        try {
          // Get patrol reports accepted
          const { data: acceptedReports } = await supabase
            .from('reports')
            .select('id, priority')
            .eq('patrol_user_id', userId);

          // Get patrol reports completed (resolved by this patrol officer)
          const { data: completedReports } = await supabase
            .from('reports')
            .select('id, priority')
            .eq('patrol_user_id', userId)
            .eq('status', 'resolved');

          // Calculate experience points
          let totalExperience = 0;
          completedReports?.forEach(report => {
            switch (report.priority) {
              case 'low':
                totalExperience += 10;
                break;
              case 'medium':
                totalExperience += 25;
                break;
              case 'high':
                totalExperience += 50;
                break;
            }
          });

          // Calculate level
          const calculateLevel = (experience: number) => {
            if (experience < 100) return 1;
            if (experience < 300) return 2;
            if (experience < 600) return 3;
            if (experience < 1000) return 4;
            if (experience < 1500) return 5;
            if (experience < 2100) return 6;
            if (experience < 2800) return 7;
            if (experience < 3600) return 8;
            if (experience < 4500) return 9;
            return 10;
          };

          patrolStats = {
            patrol_reports_accepted: acceptedReports?.length || 0,
            patrol_reports_completed: completedReports?.length || 0,
            patrol_experience_points: totalExperience,
            patrol_level: calculateLevel(totalExperience)
          };
        } catch (patrolError) {
          console.error('Error fetching patrol stats:', patrolError);
        }
      }
      
      setUserStats({
        reports_submitted: stats.reports_submitted,
        reports_verified: stats.reports_verified,
        reports_resolved: stats.reports_resolved,
        ...patrolStats
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
      setUserStats({
        reports_submitted: 0,
        reports_verified: 0,
        reports_resolved: 0,
        patrol_reports_accepted: 0,
        patrol_reports_completed: 0,
        patrol_experience_points: 0,
        patrol_level: 1
      });
    }
  };

  const fetchMyReports = async (userId: string) => {
    try {
      setLoadingMyReports(true);
      
      let query;
      if (user?.role === 'patrol') {
        // For patrol users, fetch reports they've worked on
        query = supabase
          .from('reports')
          .select('*')
          .eq('patrol_user_id', userId)
          .order('created_at', { ascending: false });
        // Also fetch resolved reports handled by this patrol
        const { data: resolved } = await supabase
          .from('reports')
          .select('*')
          .eq('patrol_user_id', userId)
          .eq('status', 'resolved')
          .order('updated_at', { ascending: false });
        setMyResolvedReports(resolved || []);
      } else {
        // For regular users, fetch reports they've submitted
        query = supabase
          .from('reports')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      setMyReports(data || []);
    } catch (error) {
      console.error('Error fetching my reports:', error);
      setMyReports([]);
      setMyResolvedReports([]);
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
    <div className="w-full px-3 sm:px-4 lg:px-6 py-6 sm:py-8">
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

        {/* Reports for this profile (own or other user) - For regular users */}
        {user?.role !== 'patrol' && (
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
        )}

        {/* Patrol: Resolved Reports they completed */}
        {user?.role === 'patrol' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-emerald-600" />
                {isOwnProfile ? 'My Resolved Reports' : `${user?.username || 'Patrol'} Resolved Reports`}
              </h3>
            </div>
            {loadingMyReports ? (
              <p className="text-gray-600">Loading resolved reports…</p>
            ) : myResolvedReports.length === 0 ? (
              <p className="text-gray-600">No resolved reports yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myResolvedReports.map((report) => (
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
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Resolved
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(report.updated_at || report.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Profile Sections */}
        <div className={`grid gap-8 ${user?.role === 'patrol' ? 'md:grid-cols-1' : 'md:grid-cols-2'}`}>
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

          {/* Achievements - Only show for non-patrol users */}
          {user?.role !== 'patrol' && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Award className="w-5 h-5 mr-2 text-gray-500" />
                Achievements
              </h3>
              <AchievementsPanel userId={user?.id || ''} />
            </div>
          )}

          {/* Activity Stats */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-gray-500" />
              {user?.role === 'patrol' ? 'Patrol Stats' : 'Activity Stats'}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {user?.role === 'patrol' ? (
                // Patrol-specific stats
                <>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-2xl font-bold text-primary-dark">{userStats.patrol_level}</p>
                    <p className="text-sm text-gray-600">Patrol Level</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-2xl font-bold text-primary-dark">{userStats.patrol_experience_points}</p>
                    <p className="text-sm text-gray-600">Experience Points</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-2xl font-bold text-primary-dark">{userStats.patrol_reports_accepted}</p>
                    <p className="text-sm text-gray-600">Reports Accepted</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-2xl font-bold text-primary-dark">{userStats.patrol_reports_completed}</p>
                    <p className="text-sm text-gray-600">Reports Completed</p>
                  </div>
                </>
              ) : (
                // Regular user stats
                <>
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
                </>
              )}
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
              setDeleteTarget(null);
              setDeleteSuccess('Your report was deleted successfully.');
            } catch (err) {
              console.error('Error deleting report:', err);
              setDeleteError(err instanceof Error ? err.message : 'Failed to delete report.');
            }
          }}
          title="Delete Report?"
          message="This action will permanently delete your report and its images. This cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />
      )}
      {deleteSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl p-8 text-center">
            <div className="mx-auto mb-4 relative h-16 w-16">
              <span className="absolute inset-0 rounded-full bg-green-100 animate-ping"></span>
              <div className="relative h-16 w-16 rounded-full bg-green-600 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-1">Deleted</h3>
            <p className="text-gray-600 mb-6">{deleteSuccess}</p>
            <button
              type="button"
              onClick={() => setDeleteSuccess(null)}
              className="px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {deleteError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl p-8 text-center">
            <div className="mx-auto mb-4 relative h-16 w-16">
              <span className="absolute inset-0 rounded-full bg-red-100 animate-ping"></span>
              <div className="relative h-16 w-16 rounded-full bg-red-600 flex items-center justify-center">
                <AlertCircle className="h-10 w-10 text-white" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-1">Delete failed</h3>
            <p className="text-gray-600 mb-6">{deleteError}</p>
            <div className="flex items-center justify-center space-x-3">
              <button
                type="button"
                onClick={() => setDeleteError(null)}
                className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}