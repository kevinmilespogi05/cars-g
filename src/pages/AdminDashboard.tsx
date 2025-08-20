import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { awardPoints } from '../lib/points';
import { deleteMultipleImages } from '../lib/cloudinaryStorage';
import { 
  Check, 
  X, 
  Trash2, 
  Search, 
  Filter, 
  Users, 
  BarChart3, 
  Settings, 
  Loader2,
  Eye,
  Calendar,
  MapPin,
  AlertTriangle,
  Menu
} from 'lucide-react';
import { UserManagement } from '../components/UserManagement';
import { activityService } from '../services/activityService';
import { AdminStatistics } from '../components/AdminStatistics';
import { AdminSettings } from '../components/AdminSettings';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { Notification } from '../components/Notification';

interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected';
  priority: 'low' | 'medium' | 'high';
  location_address: string;
  created_at: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  images: string[];
}

export function AdminDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | Report['status']>('all');
  const [activeTab, setActiveTab] = useState<'reports' | 'users' | 'stats' | 'settings'>('reports');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Check if user has admin privileges
  useEffect(() => {
    // TODO: Re-enable admin check after testing
    // if (user && user.role !== 'admin') {
    //   showNotification('Admin privileges required to access this dashboard', 'error');
    //   // Optionally redirect to home page
    //   setTimeout(() => {
    //     navigate('/');
    //   }, 2000);
    // }
  }, [user, navigate]);

  useEffect(() => {
    fetchReports();
  }, [filter]);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  // Debounced version of updateReportStatus to prevent rapid clicking
  const debouncedUpdateStatus = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (reportId: string, newStatus: Report['status']) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          updateReportStatus(reportId, newStatus);
        }, 100); // 100ms debounce
      };
    })(),
    []
  );

  const fetchReports = async () => {
    setLoading(true);
    try {
      // First fetch reports
      const { data: reportsData, error: reportsError } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (reportsError) throw reportsError;

      if (!reportsData || reportsData.length === 0) {
        setReports([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(reportsData.map(report => report.user_id))];

      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Create a map for quick profile lookup
      const profilesMap = new Map(
        profilesData?.map(profile => [profile.id, profile]) || []
      );

      // Combine reports with profile data
      const reportsWithProfiles = reportsData.map(report => {
        const profile = profilesMap.get(report.user_id);
        return {
          ...report,
          username: profile?.username || 'Unknown User',
          avatar_url: profile?.avatar_url || null,
          images: report.images || []
        };
      });

      setReports(reportsWithProfiles);
    } catch (error) {
      console.error('Error fetching reports:', error);
      showNotification('Failed to fetch reports', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateReportStatus = async (reportId: string, newStatus: Report['status']) => {
    setActionLoading(true);
    setActionLoadingId(reportId);
    
    try {
      const { error } = await supabase
        .from('reports')
        .update({ status: newStatus })
        .eq('id', reportId);

      if (error) throw error;

      setReports(prev => 
        prev.map(report => 
          report.id === reportId 
            ? { ...report, status: newStatus }
            : report
        )
      );

      showNotification(`Report status updated to ${newStatus.replace('_', ' ')}`, 'success');
    } catch (error) {
      console.error('Error updating report status:', error);
      showNotification('Failed to update report status', 'error');
    } finally {
      setActionLoading(false);
      setActionLoadingId(null);
    }
  };

  const deleteReport = async (reportId: string) => {
    setActionLoading(true);
    setActionLoadingId(reportId);
    
    try {
      // Get report to delete images
      const reportToDelete = reports.find(r => r.id === reportId);
      
      // Delete images from Cloudinary if they exist
      if (reportToDelete?.images && reportToDelete.images.length > 0) {
        await deleteMultipleImages(reportToDelete.images);
      }

      // Delete report from database
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      // Remove from local state
      setReports(prev => prev.filter(report => report.id !== reportId));
      
      // Close modal and dialog
      setSelectedReport(null);
      setShowDeleteDialog(false);
      setReportToDelete(null);

      showNotification('Report deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting report:', error);
      showNotification('Failed to delete report', 'error');
    } finally {
      setActionLoading(false);
      setActionLoadingId(null);
    }
  };

  const confirmDelete = () => {
    if (reportToDelete) {
      deleteReport(reportToDelete);
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || report.status === filter;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: Report['status']) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'in_progress': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'resolved': return 'text-green-600 bg-green-50 border-green-200';
      case 'rejected': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityColor = (priority: Report['priority']) => {
    switch (priority) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: Report['status']) => {
    switch (status) {
      case 'pending': return <AlertTriangle className="h-4 w-4" />;
      case 'in_progress': return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'resolved': return <Check className="h-4 w-4" />;
      case 'rejected': return <X className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            
            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setActiveTab('reports');
                  setShowMobileMenu(false);
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'reports'
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Reports
              </button>
              <button
                onClick={() => {
                  setActiveTab('users');
                  setShowMobileMenu(false);
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'users'
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Users
              </button>
              <button
                onClick={() => {
                  setActiveTab('stats');
                  setShowMobileMenu(false);
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'stats'
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Statistics
              </button>
              <button
                onClick={() => {
                  setActiveTab('settings');
                  setShowMobileMenu(false);
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'settings'
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Settings
              </button>
            </div>
          </div>
        )}

        {/* Desktop Tabs */}
        <div className="hidden md:block mb-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'reports'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Reports
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'stats'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Statistics
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Settings
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'reports' && (
            <div className="space-y-6">
              {/* Search and Filter */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search reports by title, description, or username..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      />
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value as 'all' | Report['status'])}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Reports List */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading reports...</p>
                  </div>
                ) : filteredReports.length === 0 ? (
                  <div className="p-8 text-center">
                    <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
                    <p className="text-gray-500">
                      {searchTerm || filter !== 'all' 
                        ? 'Try adjusting your search or filter criteria.'
                        : 'There are no reports to display at the moment.'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredReports.map((report) => (
                      <div key={report.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900 truncate">
                                {report.title}
                              </h3>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(report.status)}`}>
                                {getStatusIcon(report.status)}
                                <span className="ml-1">{report.status.replace('_', ' ')}</span>
                              </span>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(report.priority)}`}>
                                {report.priority}
                              </span>
                            </div>
                            <p className="text-gray-600 mb-3 line-clamp-2">{report.description}</p>
                            <div className="flex items-center space-x-4 text-sm text-gray-700">
                              <div className="flex items-center">
                                <Users className="h-4 w-4 mr-1 text-gray-600" />
                                <span className="font-medium text-gray-800">{report.username}</span>
                              </div>
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1 text-gray-600" />
                                <span className="font-medium text-gray-800">{new Date(report.created_at).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center">
                                <MapPin className="h-4 w-4 mr-1 text-gray-600" />
                                <span className="font-medium text-gray-800">{report.location_address}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => setSelectedReport(report)}
                              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="View details"
                            >
                              <Eye className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => {
                                setReportToDelete(report.id);
                                setShowDeleteDialog(true);
                              }}
                              disabled={actionLoading && actionLoadingId === report.id}
                              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Delete report"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </div>

                        {/* Status Update Buttons */}
                        <div className="mt-4 flex flex-wrap gap-2">
                          {report.status !== 'pending' && (
                            <button
                              onClick={() => debouncedUpdateStatus(report.id, 'pending')}
                              disabled={actionLoading && actionLoadingId === report.id}
                              className="px-3 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-100 border border-yellow-200 rounded-lg hover:bg-yellow-200 transition-colors disabled:opacity-50"
                            >
                              Mark Pending
                            </button>
                          )}
                          {report.status !== 'in_progress' && (
                            <button
                              onClick={() => debouncedUpdateStatus(report.id, 'in_progress')}
                              disabled={actionLoading && actionLoadingId === report.id}
                              className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 border border-blue-200 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
                            >
                              Mark In Progress
                            </button>
                          )}
                          {report.status !== 'resolved' && (
                            <button
                              onClick={() => debouncedUpdateStatus(report.id, 'resolved')}
                              disabled={actionLoading && actionLoadingId === report.id}
                              className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 border border-green-200 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                            >
                              Mark Resolved
                            </button>
                          )}
                          {report.status !== 'rejected' && (
                            <button
                              onClick={() => debouncedUpdateStatus(report.id, 'rejected')}
                              disabled={actionLoading && actionLoadingId === report.id}
                              className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 border border-red-200 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                            >
                              Mark Rejected
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'stats' && <AdminStatistics />}
          {activeTab === 'settings' && <AdminSettings />}
        </div>
      </div>

      {/* Report Details Modal - Mobile Optimized */}
      {selectedReport && (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl border border-white/50">
            <div className="px-6 py-6 sm:px-8 sm:py-8">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-bold text-gray-900 pr-4 leading-tight">{selectedReport.title}</h3>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0 p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="mb-6">
                <p className="text-base text-gray-700 leading-relaxed">{selectedReport.description}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700">Category</h4>
                  <p className="mt-1 text-sm text-gray-900">{selectedReport.category}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-700">Priority</h4>
                  <p className={`mt-1 text-sm font-medium ${getPriorityColor(selectedReport.priority)}`}>
                    {selectedReport.priority}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-700">Status</h4>
                  <p className={`mt-1 text-sm font-medium ${getStatusColor(selectedReport.status)}`}>
                    {selectedReport.status.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-700">Reported By</h4>
                  <div className="mt-2 flex items-center">
                    {selectedReport.avatar_url ? (
                      <img
                        src={selectedReport.avatar_url}
                        alt={selectedReport.username}
                        className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500 font-medium text-sm">
                          {selectedReport.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="ml-3">
                      <div className="text-sm font-semibold text-gray-900">{selectedReport.username}</div>
                      <div className="text-sm font-medium text-gray-700">
                        {new Date(selectedReport.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <h4 className="text-sm font-semibold text-gray-700">Location</h4>
                  <p className="mt-1 text-sm text-gray-900 flex items-center">
                    <MapPin className="h-4 w-4 mr-1 text-gray-600" />
                    {selectedReport.location_address}
                  </p>
                </div>
              </div>
              {selectedReport.images && selectedReport.images.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Images</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedReport.images.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Report image ${index + 1}`}
                        className="h-20 sm:h-24 w-full object-cover rounded"
                      />
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
                <button
                  onClick={() => {
                    setReportToDelete(selectedReport.id);
                    setShowDeleteDialog(true);
                  }}
                  disabled={actionLoading && actionLoadingId === selectedReport.id}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border-2 border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {actionLoading && actionLoadingId === selectedReport.id ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-5 w-5 mr-2" />
                  )}
                  Delete Report
                </button>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border-2 border-gray-300 text-sm font-semibold rounded-xl text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Confirmation Dialog */}
      {showDeleteDialog && reportToDelete && (
        <ConfirmationDialog
          isOpen={showDeleteDialog}
          title="Confirm Deletion"
          message={`Are you sure you want to delete this report? This action cannot be undone.`}
          onConfirm={confirmDelete}
          onClose={() => {
            setShowDeleteDialog(false);
            setReportToDelete(null);
          }}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />
      )}
    </div>
  );
} 