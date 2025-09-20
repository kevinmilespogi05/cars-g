import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { Award, MapPin, Star, Edit2, Save, X, Camera, Shield, Bell, Lock, Calendar, Eye, CheckCircle, AlertCircle, Search, Filter, X as XIcon, ArrowLeft } from 'lucide-react';
import { AchievementsPanel } from '../components/AchievementsPanel';
import { AvatarSelector } from '../components/AvatarSelector';
import { ProfileSettingsTabs } from '../components/ProfileSettingsTabs';
import { ProfileTabContent } from '../components/ProfileTabContent';
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

  // Patrol duty group derived from today's duty schedule
  const [patrolGroup, setPatrolGroup] = useState<string | null>(null);

  const isOwnProfile = !id || (currentUser && id === currentUser.id);
  const user = isOwnProfile ? currentUser : profileData;
  const [myReports, setMyReports] = useState<Report[]>([]);
  const [myResolvedReports, setMyResolvedReports] = useState<Report[]>([]);
  const [loadingMyReports, setLoadingMyReports] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Report | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'verifying':
        return 'bg-purple-100 text-purple-800';
      case 'awaiting_verification':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const getPriorityColor = useCallback((priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }, []);

  // Memoized filtered reports
  const filteredReports = useMemo(() => {
    let filtered = myReports;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(report => 
        report.title.toLowerCase().includes(query) ||
        report.description.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(report => report.status === statusFilter);
    }

    // Apply priority filter
    if (priorityFilter) {
      filtered = filtered.filter(report => report.priority === priorityFilter);
    }

    return filtered;
  }, [myReports, searchQuery, statusFilter, priorityFilter]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('');
    setPriorityFilter('');
  }, []);

  useEffect(() => {
    if (isOwnProfile) {
      if (currentUser) {
        setEditedUsername(currentUser.username || '');
        fetchUserStats(currentUser.id);
        fetchMyReports(currentUser.id);
        if (currentUser.role === 'patrol') {
          fetchPatrolGroup(currentUser.id);
        }
      }
    } else if (id) {
      fetchProfile(id);
      fetchUserStats(id);
      fetchMyReports(id);
    }
  }, [id, currentUser, isOwnProfile]);

  // Determine current shift based on local time
  const getCurrentShift = () => {
    const hour = new Date().getHours();
    return hour < 12 ? 'AM' : 'PM';
  };

  // Fetch patrol group from today's duty schedule notes (expects pattern like "group: Alpha")
  const fetchPatrolGroup = async (userId: string) => {
    try {
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      const dutyDate = `${y}-${m}-${d}`;
      const shift = getCurrentShift();

      const { data, error } = await supabase
        .from('duty_schedules')
        .select('group, notes')
        .eq('duty_date', dutyDate)
        .eq('shift', shift)
        .eq('receiver_user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching patrol group:', error);
        setPatrolGroup(null);
        return;
      }

      const groupCol: string | null = (data as any)?.group || null;
      if (groupCol) {
        setPatrolGroup(groupCol);
        return;
      }
      const notes: string | null = (data as any)?.notes || null;
      if (notes) {
        // Parse variants like: "group: Alpha", "Group- Bravo", "team=Charlie"
        const match = notes.match(/(?:group|team)\s*[:=\-]\s*([A-Za-z0-9 _-]{2,})/i);
        setPatrolGroup(match ? match[1].trim() : null);
      } else {
        setPatrolGroup(null);
      }
    } catch (err) {
      console.error('Unexpected error fetching patrol group:', err);
      setPatrolGroup(null);
    }
  };

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        {/* Go Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors group bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl shadow-sm border border-gray-200/50 hover:shadow-md"
          >
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="font-medium">Go Back</span>
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-8"
        >
        {/* Modern Profile Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-200/50 overflow-hidden relative">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-blue-600"></div>
          <div className="absolute inset-0 bg-black/5"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
          
          <div className="relative px-8 py-12">
            <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6">
              <div className="flex items-end gap-6">
                <div className="relative group">
                  <div className="absolute -inset-2 bg-blue-500 rounded-full opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div>
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
                      className="h-32 w-32 rounded-full object-cover border-4 border-white shadow-2xl group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                    />
                  )}
                  {/* Online Status Indicator */}
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 border-4 border-white rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                </div>
                
                <div className="text-white">
                  {isOwnProfile && isEditing ? (
                    <div className="flex items-center gap-3 mb-2">
                      <input
                        type="text"
                        value={editedUsername}
                        onChange={(e) => setEditedUsername(e.target.value)}
                        className="text-3xl font-bold bg-white/90 text-gray-900 border-2 border-white/50 rounded-xl px-4 py-2 shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white"
                        placeholder="Enter username"
                      />
                      <button
                        onClick={handleSaveProfile}
                        disabled={isUpdating}
                        className="p-3 rounded-xl bg-white/20 text-white hover:bg-white/30 transition-colors duration-200 shadow-lg disabled:opacity-60"
                        aria-label="Save username"
                      >
                        <Save className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="p-3 rounded-xl bg-white/20 text-white hover:bg-white/30 transition-colors duration-200 shadow-lg"
                        aria-label="Cancel editing"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-4xl font-bold text-white drop-shadow-lg">
                        {user?.username || 'Not set'}
                      </h1>
                      {user?.role === 'patrol' && patrolGroup && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-400/20 text-emerald-100 border border-emerald-300/30">
                          Group: {patrolGroup}
                        </span>
                      )}
                      {isOwnProfile && (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30 transition-colors duration-200 shadow-lg"
                          aria-label="Edit username"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 text-white/90">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span className="text-lg">Member since {formatDate(user?.created_at)}</span>
                    </div>
                    {user?.role === 'admin' && (
                      <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                        <Shield className="w-4 h-4" />
                        <span className="font-semibold capitalize">{user.role}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Points and Stats */}
              <div className="flex flex-col lg:items-end gap-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 text-center">
                  <div className="text-3xl font-bold text-white mb-1">
                    {user?.points || 0}
                  </div>
                  <div className="text-white/90 font-medium">Total Points</div>
                </div>
                
                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-white">{userStats.reports_submitted}</div>
                    <div className="text-xs text-white/80">Reports</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-white">{userStats.reports_verified}</div>
                    <div className="text-xs text-white/80">Verified</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Modern Tabbed Profile Settings */}
                          {isOwnProfile ? (
          <ProfileSettingsTabs
            user={user}
            isOwnProfile={isOwnProfile}
            userStats={userStats}
            notificationSettings={notificationSettings}
            onNotificationToggle={handleNotificationToggle}
          >
            <ProfileTabContent
              myReports={myReports}
              myResolvedReports={myResolvedReports}
              loadingMyReports={loadingMyReports}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              priorityFilter={priorityFilter}
              setPriorityFilter={setPriorityFilter}
              clearFilters={clearFilters}
              filteredReports={filteredReports}
              setDeleteTarget={setDeleteTarget}
            />
          </ProfileSettingsTabs>
        ) : (
          /* For other users' profiles, show a simplified view */
          <div className="grid gap-8 md:grid-cols-2">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-200/50 bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-500 rounded-xl">
                    <Lock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Account Information</h3>
                    <p className="text-gray-600">Public profile information</p>
                  </div>
                </div>
              </div>
              <div className="px-8 py-6 space-y-6">
                <div className="bg-blue-50 rounded-xl p-4">
                  <label className="block text-sm font-semibold text-blue-800 mb-2">Email Address</label>
                  <p className="text-blue-900 font-medium">{user?.email || 'Not set'}</p>
                </div>
                {user?.role === 'admin' && (
                  <div className="bg-purple-50 rounded-xl p-4">
                    <label className="block text-sm font-semibold text-purple-800 mb-2">Account Type</label>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-purple-600" />
                      <p className="text-purple-900 font-medium capitalize">{user.role}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200/50 bg-indigo-50">
              <div className="flex items-center gap-4">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-500 rounded-xl">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-900">Activity Statistics</h3>
                    <p className="text-gray-600">Public activity summary</p>
                </div>
              </div>
            </div>
            <div className="px-8 py-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-blue-900">{user?.points || 0}</div>
                    <div className="text-sm text-blue-700">Total Points</div>
                      </div>
                  <div className="bg-purple-50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-purple-900">{userStats.reports_submitted}</div>
                    <div className="text-sm text-purple-700">Reports</div>
                    </div>
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-green-900">{userStats.reports_verified}</div>
                    <div className="text-sm text-green-700">Verified</div>
                      </div>
                  <div className="bg-emerald-50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-emerald-900">{userStats.reports_resolved}</div>
                    <div className="text-sm text-emerald-700">Resolved</div>
                    </div>
                      </div>
                    </div>
                      </div>
                    </div>
        )}
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
    </div>
  );
}