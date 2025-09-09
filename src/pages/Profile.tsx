import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { Award, MapPin, Star, Edit2, Save, X, Camera, Shield, Bell, Lock, Calendar, Eye, CheckCircle, AlertCircle, Search, Filter, X as XIcon } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
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

        {/* Modern Reports Section */}
        {user?.role !== 'patrol' && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200/50 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-500 rounded-xl">
                    <MapPin className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {isOwnProfile ? 'My Reports' : `${user?.username || 'User'}'s Reports`}
                    </h3>
                    <p className="text-gray-600">
                      {isOwnProfile ? 'Manage and track your submitted reports' : 'View reports submitted by this user'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Modern Search and Filter Controls */}
            {myReports.length > 0 && (
              <div className="px-8 py-6 bg-gray-50/50">
                <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                  <div className="flex flex-col sm:flex-row gap-4 flex-1">
                    {/* Search Bar */}
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <input
                        type="text"
                        placeholder="Search reports..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                      />
                    </div>
                    
                    {/* Filter Controls */}
                    <div className="flex gap-3">
                      <div className="relative">
                        <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="pl-12 pr-8 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md appearance-none min-w-[160px]"
                        >
                          <option value="">All Statuses</option>
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="rejected">Rejected</option>
                          <option value="verifying">Verifying</option>
                          <option value="awaiting_verification">Awaiting Verification</option>
                        </select>
                      </div>
                      
                      <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="px-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md min-w-[140px]"
                      >
                        <option value="">All Priorities</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Clear Filters Button */}
                  {(searchQuery || statusFilter || priorityFilter) && (
                    <button
                      onClick={clearFilters}
                      className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-800 bg-white/80 hover:bg-white border border-gray-200 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <XIcon className="h-4 w-4" />
                      Clear Filters
                    </button>
                  )}
                </div>
                
                {/* Results Count */}
                <div className="mt-4 text-sm text-gray-600 font-medium">
                  Showing {filteredReports.length} of {myReports.length} reports
                </div>
              </div>
            )}
            <div className="px-8 py-6">
              {loadingMyReports ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-2xl mb-4 animate-pulse">
                    <MapPin className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Reports</h3>
                  <p className="text-gray-600">Fetching your reports...</p>
                </div>
              ) : myReports.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-2xl mb-4">
                    <MapPin className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Reports Yet</h3>
                  <p className="text-gray-600">Start by submitting your first report to help improve the community.</p>
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-2xl mb-4">
                    <Search className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Matching Reports</h3>
                  <p className="text-gray-600 mb-4">No reports match your search criteria.</p>
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200"
                  >
                    <XIcon className="h-4 w-4" />
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredReports.map((report) => (
                    <div
                      key={report.id}
                      className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer group overflow-hidden"
                      onClick={() => navigate(`/reports/${report.id}`)}
                    >
                      {report.images && report.images.length > 0 ? (
                        <div className="relative h-48 overflow-hidden">
                            <img 
                              src={report.images[0]} 
                              alt={report.title} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              loading="lazy"
                            />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          {report.images.length > 1 && (
                            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-medium text-gray-700">
                              +{report.images.length - 1} more
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-48 bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 flex items-center justify-center group-hover:from-gray-100 group-hover:to-gray-200 transition-all duration-200">
                          <div className="text-center">
                            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500 font-medium">No Image</p>
                          </div>
                        </div>
                      )}
                      
                      <div className="p-6">
                        <h4 className="font-bold text-gray-900 text-lg leading-tight line-clamp-2 group-hover:text-gray-700 transition-colors duration-200 mb-2">
                          {report.title}
                        </h4>
                        <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 mb-4">
                          {report.description}
                        </p>
                        
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm ${getStatusColor(report.status)}`}>
                              {report.status.replace('_', ' ')}
                            </span>
                            {report.priority && (
                              <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm ${getPriorityColor(report.priority)}`}>
                                {report.priority}
                              </span>
                            )}
                          </div>
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                            <Calendar className="h-3 w-3" />
                            {new Date(report.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                          {isOwnProfile ? (
                            <button
                              className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 text-sm font-medium transition-colors duration-200"
                              onClick={(e) => { e.stopPropagation(); setDeleteTarget(report); }}
                            >
                              <X className="h-4 w-4" />
                              Delete
                            </button>
                          ) : (
                            <span />
                          )}
                          <button
                            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors duration-200 group/view"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/reports/${report.id}`);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                            View Details
                          </button>
                        </div>
                      </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>
        )}

        {/* Modern Patrol Reports Section */}
        {user?.role === 'patrol' && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200/50 bg-emerald-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-500 rounded-xl">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {isOwnProfile ? 'My Resolved Reports' : `${user?.username || 'Patrol'} Resolved Reports`}
                    </h3>
                    <p className="text-gray-600">
                      {isOwnProfile ? 'Track your completed patrol assignments' : 'View reports resolved by this patrol officer'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-8 py-6">
              {loadingMyReports ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500 rounded-2xl mb-4 animate-pulse">
                    <CheckCircle className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Reports</h3>
                  <p className="text-gray-600">Fetching resolved reports...</p>
                </div>
              ) : myResolvedReports.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-2xl mb-4">
                    <CheckCircle className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Resolved Reports Yet</h3>
                  <p className="text-gray-600">Complete your first patrol assignment to see it here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myResolvedReports.map((report) => (
                    <div
                      key={report.id}
                      className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer group overflow-hidden"
                      onClick={() => navigate(`/reports/${report.id}`)}
                    >
                      {report.images && report.images.length > 0 ? (
                        <div className="relative h-48 overflow-hidden">
                            <img 
                              src={report.images[0]} 
                              alt={report.title} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              loading="lazy"
                            />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          <div className="absolute top-3 right-3 bg-emerald-500 text-white px-3 py-1 rounded-lg text-xs font-semibold shadow-lg">
                            Resolved
                          </div>
                        </div>
                      ) : (
                        <div className="h-48 bg-gradient-to-br from-emerald-50 via-green-100 to-emerald-200 flex items-center justify-center group-hover:from-emerald-100 group-hover:to-emerald-200 transition-all duration-200">
                          <div className="text-center">
                            <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-2" />
                            <p className="text-sm text-emerald-600 font-medium">Resolved Report</p>
                          </div>
                        </div>
                      )}
                      
                      <div className="p-6">
                        <h4 className="font-bold text-gray-900 text-lg leading-tight line-clamp-2 group-hover:text-gray-700 transition-colors duration-200 mb-2">
                          {report.title}
                        </h4>
                        <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 mb-4">
                          {report.description}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-semibold shadow-sm">
                            ✓ Resolved
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                            <Calendar className="h-3 w-3" />
                            {new Date(report.updated_at || report.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modern Profile Sections */}
        <div className={`grid gap-8 ${user?.role === 'patrol' ? 'md:grid-cols-1' : 'md:grid-cols-2'}`}>
          {/* Account Settings - Only show for own profile */}
          {isOwnProfile && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-200/50 bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-500 rounded-xl">
                    <Lock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Account Settings</h3>
                    <p className="text-gray-600">Manage your account information</p>
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
          )}

          {/* Notification Settings - Only show for own profile */}
          {isOwnProfile && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-200/50 bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-500 rounded-xl">
                    <Bell className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Notification Settings</h3>
                    <p className="text-gray-600">Control how you receive updates</p>
                  </div>
                </div>
              </div>
              <div className="px-8 py-6 space-y-6">
                <div className="bg-blue-50 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                        <Bell className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <label className="block text-lg font-semibold text-blue-900">Email Notifications</label>
                        <p className="text-blue-700">Receive updates via email</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleNotificationToggle('email')}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-200 shadow-lg hover:shadow-xl ${
                        notificationSettings.email ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                      aria-label={`${notificationSettings.email ? 'Disable' : 'Enable'} email notifications`}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-200 shadow-md ${
                          notificationSettings.email ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
                
                <div className="bg-purple-50 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                        <Bell className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <label className="block text-lg font-semibold text-purple-900">Push Notifications</label>
                        <p className="text-purple-700">Receive push notifications</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleNotificationToggle('push')}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-200 shadow-lg hover:shadow-xl ${
                        notificationSettings.push ? 'bg-purple-500' : 'bg-gray-300'
                      }`}
                      aria-label={`${notificationSettings.push ? 'Disable' : 'Enable'} push notifications`}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-200 shadow-md ${
                          notificationSettings.push ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Achievements - Only show for non-patrol users */}
          {user?.role !== 'patrol' && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-200/50 bg-yellow-50">
                <div className="flex items-center gap-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-yellow-500 rounded-xl">
                    <Award className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Achievements</h3>
                    <p className="text-gray-600">Track your progress and unlock rewards</p>
                  </div>
                </div>
              </div>
              <div className="px-8 py-6">
                <AchievementsPanel userId={user?.id || ''} />
              </div>
            </div>
          )}

          {/* Modern Activity Stats */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200/50 bg-indigo-50">
              <div className="flex items-center gap-4">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-500 rounded-xl">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {user?.role === 'patrol' ? 'Patrol Statistics' : 'Activity Statistics'}
                  </h3>
                  <p className="text-gray-600">
                    {user?.role === 'patrol' ? 'Track your patrol performance' : 'Monitor your contribution to the community'}
                  </p>
                </div>
              </div>
            </div>
            <div className="px-8 py-6">
              <div className="grid grid-cols-2 gap-6">
                {user?.role === 'patrol' ? (
                  // Patrol-specific stats
                  <>
                    <div className="bg-blue-50 rounded-2xl p-6 text-center group hover:shadow-lg transition-all duration-200">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-2xl mb-4 group-hover:scale-105 transition-transform duration-200">
                        <Shield className="h-8 w-8 text-white" />
                      </div>
                      <p className="text-4xl font-bold text-blue-900 mb-2">{userStats.patrol_level}</p>
                      <p className="text-blue-700 font-semibold">Patrol Level</p>
                    </div>
                    <div className="bg-purple-50 rounded-2xl p-6 text-center group hover:shadow-lg transition-all duration-200">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-500 rounded-2xl mb-4 group-hover:scale-105 transition-transform duration-200">
                        <Star className="h-8 w-8 text-white" />
                      </div>
                      <p className="text-4xl font-bold text-purple-900 mb-2">{userStats.patrol_experience_points}</p>
                      <p className="text-purple-700 font-semibold">Experience Points</p>
                    </div>
                    <div className="bg-green-50 rounded-2xl p-6 text-center group hover:shadow-lg transition-all duration-200">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-2xl mb-4 group-hover:scale-105 transition-transform duration-200">
                        <CheckCircle className="h-8 w-8 text-white" />
                      </div>
                      <p className="text-4xl font-bold text-green-900 mb-2">{userStats.patrol_reports_accepted}</p>
                      <p className="text-green-700 font-semibold">Reports Accepted</p>
                    </div>
                    <div className="bg-emerald-50 rounded-2xl p-6 text-center group hover:shadow-lg transition-all duration-200">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500 rounded-2xl mb-4 group-hover:scale-105 transition-transform duration-200">
                        <Award className="h-8 w-8 text-white" />
                      </div>
                      <p className="text-4xl font-bold text-emerald-900 mb-2">{userStats.patrol_reports_completed}</p>
                      <p className="text-emerald-700 font-semibold">Reports Completed</p>
                    </div>
                  </>
                ) : (
                  // Regular user stats
                  <>
                    <div className="bg-blue-50 rounded-2xl p-6 text-center group hover:shadow-lg transition-all duration-200">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-2xl mb-4 group-hover:scale-105 transition-transform duration-200">
                        <Star className="h-8 w-8 text-white" />
                      </div>
                      <p className="text-4xl font-bold text-blue-900 mb-2">{user?.points || 0}</p>
                      <p className="text-blue-700 font-semibold">Total Points</p>
                    </div>
                    <div className="bg-purple-50 rounded-2xl p-6 text-center group hover:shadow-lg transition-all duration-200">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-500 rounded-2xl mb-4 group-hover:scale-105 transition-transform duration-200">
                        <MapPin className="h-8 w-8 text-white" />
                      </div>
                      <p className="text-4xl font-bold text-purple-900 mb-2">{userStats.reports_submitted}</p>
                      <p className="text-purple-700 font-semibold">Reports Submitted</p>
                    </div>
                    <div className="bg-green-50 rounded-2xl p-6 text-center group hover:shadow-lg transition-all duration-200">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-2xl mb-4 group-hover:scale-105 transition-transform duration-200">
                        <CheckCircle className="h-8 w-8 text-white" />
                      </div>
                      <p className="text-4xl font-bold text-green-900 mb-2">{userStats.reports_verified}</p>
                      <p className="text-green-700 font-semibold">Reports Verified</p>
                    </div>
                    <div className="bg-emerald-50 rounded-2xl p-6 text-center group hover:shadow-lg transition-all duration-200">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500 rounded-2xl mb-4 group-hover:scale-105 transition-transform duration-200">
                        <Award className="h-8 w-8 text-white" />
                      </div>
                      <p className="text-4xl font-bold text-emerald-900 mb-2">{userStats.reports_resolved}</p>
                      <p className="text-emerald-700 font-semibold">Reports Resolved</p>
                    </div>
                  </>
                )}
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