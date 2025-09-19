import React from 'react';
import { 
  User, 
  Bell, 
  Shield, 
  Award, 
  Lock, 
  Calendar,
  Mail,
  MapPin,
  CheckCircle,
  Star,
  BarChart3,
  TrendingUp,
  FileText,
  Eye,
  X,
  Search,
  Filter,
  X as XIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Report } from '../types';
import { AchievementsPanel } from './AchievementsPanel';

interface ProfileTabContentProps {
  activeTab: string;
  user: any;
  isOwnProfile: boolean;
  userStats: any;
  notificationSettings: any;
  onNotificationToggle: (type: 'email' | 'push') => void;
  myReports?: Report[];
  myResolvedReports?: Report[];
  loadingMyReports?: boolean;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  statusFilter?: string;
  setStatusFilter?: (filter: string) => void;
  priorityFilter?: string;
  setPriorityFilter?: (filter: string) => void;
  clearFilters?: () => void;
  filteredReports?: Report[];
  setDeleteTarget?: (report: Report | null) => void;
}

export function ProfileTabContent({
  activeTab,
  user,
  isOwnProfile,
  userStats,
  notificationSettings,
  onNotificationToggle,
  myReports = [],
  myResolvedReports = [],
  loadingMyReports = false,
  searchQuery = '',
  setSearchQuery = () => {},
  statusFilter = '',
  setStatusFilter = () => {},
  priorityFilter = '',
  setPriorityFilter = () => {},
  clearFilters = () => {},
  filteredReports = [],
  setDeleteTarget = () => {}
}: ProfileTabContentProps) {
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
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
  };

  const getPriorityColor = (priority: string) => {
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
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Not available';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      return 'Not available';
    }
  };

  const renderOverview = () => (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-blue-500 rounded-xl">
          <User className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Profile Overview</h3>
          <p className="text-gray-600">Your account information and activity summary</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Profile Information */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Personal Information
            </h4>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium text-gray-900">{user?.email || 'Not set'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Member Since</p>
                  <p className="font-medium text-gray-900">{formatDate(user?.created_at)}</p>
                </div>
              </div>
              {user?.role === 'admin' && (
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Account Type</p>
                    <p className="font-medium text-purple-900 capitalize">{user.role}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-600" />
              Quick Stats
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-900">{user?.points || 0}</div>
                <div className="text-sm text-green-700">Total Points</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-900">{userStats.reports_submitted}</div>
                <div className="text-sm text-green-700">Reports</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-900">{userStats.reports_verified}</div>
                <div className="text-sm text-green-700">Verified</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-900">{userStats.reports_resolved}</div>
                <div className="text-sm text-green-700">Resolved</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderReports = () => {
    const isPatrolUser = user?.role === 'patrol';
    const reportsToShow = isPatrolUser ? myResolvedReports : myReports;
    const reportsTitle = isPatrolUser ? 'My Resolved Reports' : (isOwnProfile ? 'My Reports' : `${user?.username || 'User'}'s Reports`);
    const reportsDescription = isPatrolUser 
      ? 'Track your completed patrol assignments' 
      : (isOwnProfile ? 'Manage and track your submitted reports' : 'View reports submitted by this user');

    // Create filtered reports for patrol users
    const patrolFilteredReports = isPatrolUser ? (() => {
      let filtered = myResolvedReports || [];

      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(report => 
          report.title.toLowerCase().includes(query) ||
          report.description.toLowerCase().includes(query)
        );
      }

      // Apply status filter (for patrol, we only show resolved, but allow filtering by other criteria)
      if (statusFilter) {
        filtered = filtered.filter(report => report.status === statusFilter);
      }

      // Apply priority filter
      if (priorityFilter) {
        filtered = filtered.filter(report => report.priority === priorityFilter);
      }

      return filtered;
    })() : filteredReports;

    return (
      <div className="p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-green-500 rounded-xl">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              {reportsTitle}
            </h3>
            <p className="text-gray-600">
              {reportsDescription}
            </p>
          </div>
        </div>

      {/* Search and Filter Controls */}
      {reportsToShow.length > 0 && (
        <div className="mb-8 bg-gray-50/50 rounded-2xl p-6">
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
                  className="w-full pl-12 pr-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 shadow-sm hover:shadow-md"
                />
              </div>
              
              {/* Filter Controls */}
              <div className="flex gap-3">
                <div className="relative">
                  <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="pl-12 pr-8 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 shadow-sm hover:shadow-md appearance-none min-w-[160px]"
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
                  className="px-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 shadow-sm hover:shadow-md min-w-[140px]"
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
            Showing {patrolFilteredReports.length} of {reportsToShow.length} reports
          </div>
        </div>
      )}

      {/* Reports Grid */}
      {loadingMyReports ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-2xl mb-4 animate-pulse">
            <FileText className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Reports</h3>
          <p className="text-gray-600">Fetching your reports...</p>
        </div>
      ) : reportsToShow.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-2xl mb-4">
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {isPatrolUser ? 'No Resolved Reports Yet' : 'No Reports Yet'}
          </h3>
          <p className="text-gray-600">
            {isPatrolUser 
              ? 'Complete your first patrol assignment to see it here.' 
              : 'Start by submitting your first report to help improve the community.'
            }
          </p>
        </div>
      ) : patrolFilteredReports.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-2xl mb-4">
            <Search className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Matching Reports</h3>
          <p className="text-gray-600 mb-4">No reports match your search criteria.</p>
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors duration-200"
          >
            <XIcon className="h-4 w-4" />
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {patrolFilteredReports.map((report) => (
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
                  {isPatrolUser && (
                    <div className="absolute top-3 left-3 bg-emerald-500 text-white px-3 py-1 rounded-lg text-xs font-semibold shadow-lg">
                      ✓ Resolved
                    </div>
                  )}
                </div>
              ) : (
                <div className={`h-48 flex items-center justify-center transition-all duration-200 ${
                  isPatrolUser 
                    ? 'bg-gradient-to-br from-emerald-50 via-green-100 to-emerald-200 group-hover:from-emerald-100 group-hover:to-emerald-200'
                    : 'bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 group-hover:from-gray-100 group-hover:to-gray-200'
                }`}>
                  <div className="text-center">
                    {isPatrolUser ? (
                      <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-2" />
                    ) : (
                      <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    )}
                    <p className={`text-sm font-medium ${
                      isPatrolUser ? 'text-emerald-600' : 'text-gray-500'
                    }`}>
                      {isPatrolUser ? 'Resolved Report' : 'No Image'}
                    </p>
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
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm ${
                      isPatrolUser ? 'bg-emerald-100 text-emerald-800' : getStatusColor(report.status)
                    }`}>
                      {isPatrolUser ? '✓ Resolved' : report.status.replace('_', ' ')}
                    </span>
                    {report.priority && (
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm ${getPriorityColor(report.priority)}`}>
                        {report.priority}
                      </span>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                    <Calendar className="h-3 w-3" />
                    {new Date(report.updated_at || report.created_at).toLocaleDateString()}
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
                    className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 text-sm font-medium transition-colors duration-200 group/view"
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
    );
  };

  const renderNotifications = () => (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-purple-500 rounded-xl">
          <Bell className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Notification Settings</h3>
          <p className="text-gray-600">Control how you receive updates and notifications</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-blue-50 rounded-2xl p-6">
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
              onClick={() => onNotificationToggle('email')}
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
        
        <div className="bg-purple-50 rounded-2xl p-6">
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
              onClick={() => onNotificationToggle('push')}
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
  );

  const renderAccount = () => (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-gray-500 rounded-xl">
          <Lock className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Account Settings</h3>
          <p className="text-gray-600">Manage your account information and security</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-blue-50 rounded-2xl p-6">
          <label className="block text-sm font-semibold text-blue-800 mb-2">Email Address</label>
          <p className="text-blue-900 font-medium">{user?.email || 'Not set'}</p>
        </div>
        
        {user?.role === 'admin' && (
          <div className="bg-purple-50 rounded-2xl p-6">
            <label className="block text-sm font-semibold text-purple-800 mb-2">Account Type</label>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-purple-600" />
              <p className="text-purple-900 font-medium capitalize">{user.role}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderAchievements = () => (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-yellow-500 rounded-xl">
          <Award className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Achievements</h3>
          <p className="text-gray-600">Track your progress and unlock rewards</p>
        </div>
      </div>
      
      <AchievementsPanel userId={user?.id || ''} />
    </div>
  );

  const renderStatistics = () => (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-indigo-500 rounded-xl">
          <BarChart3 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900">
            {user?.role === 'patrol' ? 'Patrol Statistics' : 'Activity Statistics'}
          </h3>
          <p className="text-gray-600">
            {user?.role === 'patrol' ? 'Track your patrol performance' : 'Monitor your contribution to the community'}
          </p>
        </div>
      </div>

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
  );

  switch (activeTab) {
    case 'overview':
      return renderOverview();
    case 'reports':
      return renderReports();
    case 'notifications':
      return renderNotifications();
    case 'account':
      return renderAccount();
    case 'achievements':
      return renderAchievements();
    case 'statistics':
      return renderStatistics();
    default:
      return renderOverview();
  }
}
