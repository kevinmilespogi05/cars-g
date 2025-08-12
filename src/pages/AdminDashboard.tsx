import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { awardPoints } from '../lib/points';
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
  AlertTriangle
} from 'lucide-react';
import { UserManagement } from '../components/UserManagement';
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

interface NotificationState {
  message: string;
  type: 'success' | 'error' | 'warning';
  show: boolean;
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
      let query = supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data: reportsData, error: reportsError } = await query;

      if (reportsError) throw reportsError;

      // Then fetch usernames and avatar_urls for each report
      const userIds = reportsData?.map(report => report.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Combine the data
      const formattedReports = reportsData?.map(report => {
        const profile = profilesData?.find(p => p.id === report.user_id);
        return {
          ...report,
          username: profile?.username || 'Unknown User',
          avatar_url: profile?.avatar_url || null
        };
      }) || [];

      setReports(formattedReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
      showNotification('Failed to fetch reports', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateReportStatus = async (reportId: string, newStatus: Report['status']) => {
    setActionLoading(true);
    setActionLoadingId(reportId); // Set the loading ID
    try {
      // Validate the status value
      const validStatuses = ['pending', 'in_progress', 'resolved', 'rejected'] as const;
      if (!validStatuses.includes(newStatus as any)) {
        throw new Error(`Invalid status value: ${newStatus}`);
      }

      // First update the report status
      const { error: updateError } = await supabase
        .from('reports')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      // Update local state immediately for better UX
      setReports(prevReports => 
        prevReports.map(report => 
          report.id === reportId 
            ? { ...report, status: newStatus, updated_at: new Date().toISOString() }
            : report
        )
      );

      showNotification(`Report ${newStatus.replace('_', ' ')} successfully`, 'success');
      
      // Award points in the background (non-blocking)
      const report = reports.find(r => r.id === reportId);
      if (report) {
        // Use setTimeout to make this non-blocking
        setTimeout(async () => {
          try {
            if (newStatus === 'in_progress') {
              await awardPoints(report.user_id, 'REPORT_VERIFIED', reportId);
            } else if (newStatus === 'resolved') {
              await awardPoints(report.user_id, 'REPORT_RESOLVED', reportId);
            }
          } catch (pointsError) {
            console.error('Error awarding points:', pointsError);
            // Don't show error to user as the main action was successful
          }
        }, 0);
      }
    } catch (error) {
      console.error('Error updating report status:', error);
      showNotification('Failed to update report status', 'error');
    } finally {
      setActionLoading(false);
      setActionLoadingId(null); // Clear the loading ID
    }
  };

  const deleteReport = async (reportId: string) => {
    setReportToDelete(reportId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!reportToDelete) return;
    
    setActionLoading(true);
    setActionLoadingId(reportToDelete);
    try {
      // First, delete any associated images from storage
      const report = reports.find(r => r.id === reportToDelete);
      if (report?.images?.length) {
        for (const imageUrl of report.images) {
          const imagePath = imageUrl.split('/').pop(); // Get the filename from the URL
          if (imagePath) {
            const { error: storageError } = await supabase.storage
              .from('reports')
              .remove([imagePath]);
            
            if (storageError) {
              console.error('Error deleting image:', storageError);
              // Continue with deletion even if image deletion fails
            }
          }
        }
      }

      // Then delete the report itself
      const { data, error: deleteError } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportToDelete)
        .select();

      console.log('Delete response:', { data, error: deleteError });

      if (deleteError) {
        console.error('Delete error:', deleteError);
        throw deleteError;
      }

      if (!data || data.length === 0) {
        throw new Error('Report not deleted - no rows affected');
      }

      showNotification('Report deleted successfully', 'success');
      
      // Close the modal if the deleted report was selected
      if (selectedReport?.id === reportToDelete) {
        setSelectedReport(null);
      }
      
      // Remove the deleted report from the local state
      setReports(prevReports => prevReports.filter(r => r.id !== reportToDelete));
    } catch (error) {
      console.error('Error deleting report:', error);
      showNotification('Failed to delete report', 'error');
    } finally {
      setActionLoading(false);
      setActionLoadingId(null);
      setShowDeleteDialog(false);
      setReportToDelete(null);
    }
  };

  const filteredReports = reports.filter(report => {
    if (searchTerm === '') return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      report.title.toLowerCase().includes(searchLower) ||
      report.description.toLowerCase().includes(searchLower) ||
      report.category.toLowerCase().includes(searchLower) ||
      report.location_address.toLowerCase().includes(searchLower) ||
      report.username.toLowerCase().includes(searchLower)
    );
  });

  const getStatusColor = (status: Report['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: Report['priority']) => {
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Admin Dashboard</h3>
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab('reports')}
                className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md ${
                  activeTab === 'reports'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <MapPin className="h-4 w-4 mr-2" />
                Reports
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md ${
                  activeTab === 'users'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <Users className="h-4 w-4 mr-2" />
                Users
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md ${
                  activeTab === 'stats'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Statistics
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md ${
                  activeTab === 'settings'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </button>
            </div>
          </div>

          {activeTab === 'reports' && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex space-x-2">
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as any)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="all">All Reports</option>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search reports..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </div>
                <button
                  onClick={fetchReports}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Loader2 className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                  <ul className="divide-y divide-gray-200">
                    {filteredReports.map((report) => (
                      <li 
                        key={report.id} 
                        className="px-4 py-4 sm:px-6 hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedReport(report)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 pr-4">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                  {report.title}
                                </h3>
                                <div className="flex items-center text-sm text-gray-600 mb-3">
                                  <MapPin className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                  {report.location_address}
                                </div>
                                <div className="flex items-center space-x-3">
                                  <p className={`px-3 py-1 inline-flex text-xs font-medium rounded-full ${getStatusColor(report.status)}`}>
                                    {report.status.replace('_', ' ')}
                                  </p>
                                  <p className={`px-3 py-1 inline-flex text-xs font-medium rounded-full ${getPriorityColor(report.priority)}`}>
                                    {report.priority}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0">
                                    {report.avatar_url ? (
                                      <img
                                        src={report.avatar_url}
                                        alt={report.username}
                                        className="h-12 w-12 rounded-full object-cover border-2 border-gray-200 shadow-sm"
                                      />
                                    ) : (
                                      <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200 shadow-sm">
                                        <span className="text-gray-500 font-medium text-lg">
                                          {report.username.charAt(0).toUpperCase()}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="ml-3">
                                    <div className="text-sm font-medium text-gray-900">{report.username}</div>
                                    <div className="text-xs text-gray-500">{new Date(report.created_at).toLocaleDateString()}</div>
                                  </div>
                                </div>
                                <div className="flex space-x-2">
                                  {report.status === 'pending' && (
                                    <>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          debouncedUpdateStatus(report.id, 'in_progress');
                                        }}
                                        disabled={actionLoading && actionLoadingId === report.id}
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                      >
                                        {actionLoading && actionLoadingId === report.id ? (
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                          <Check className="h-4 w-4 mr-2" />
                                        )}
                                        Accept
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          debouncedUpdateStatus(report.id, 'rejected');
                                        }}
                                        disabled={actionLoading && actionLoadingId === report.id}
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                      >
                                        {actionLoading && actionLoadingId === report.id ? (
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                          <X className="h-4 w-4 mr-2" />
                                        )}
                                        Reject
                                      </button>
                                    </>
                                  )}
                                  {report.status === 'in_progress' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        debouncedUpdateStatus(report.id, 'resolved');
                                      }}
                                      disabled={actionLoading && actionLoadingId === report.id}
                                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                    >
                                      {actionLoading && actionLoadingId === report.id ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      ) : (
                                        <Check className="h-4 w-4 mr-2" />
                                      )}
                                      Mark as Resolved
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'stats' && <AdminStatistics />}
          {activeTab === 'settings' && <AdminSettings />}
        </div>
      </div>

      {/* Report Details Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-start">
                <h3 className="text-lg leading-6 font-medium text-gray-900">{selectedReport.title}</h3>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="mt-2">
                <p className="text-sm text-gray-500">{selectedReport.description}</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Category</h4>
                  <p className="mt-1 text-sm text-gray-900">{selectedReport.category}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Priority</h4>
                  <p className={`mt-1 text-sm font-medium ${getPriorityColor(selectedReport.priority)}`}>
                    {selectedReport.priority}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Status</h4>
                  <p className={`mt-1 text-sm font-medium ${getStatusColor(selectedReport.status)}`}>
                    {selectedReport.status.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Reported By</h4>
                  <div className="mt-2 flex items-center">
                    {selectedReport.avatar_url ? (
                      <img
                        src={selectedReport.avatar_url}
                        alt={selectedReport.username}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500 font-medium">
                          {selectedReport.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{selectedReport.username}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(selectedReport.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-span-2">
                  <h4 className="text-sm font-medium text-gray-500">Location</h4>
                  <p className="mt-1 text-sm text-gray-900 flex items-center">
                    <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                    {selectedReport.location_address}
                  </p>
                </div>
              </div>
              {selectedReport.images && selectedReport.images.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-500">Images</h4>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {selectedReport.images.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Report image ${index + 1}`}
                        className="h-24 w-full object-cover rounded"
                      />
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-5 flex justify-end space-x-2">
                <button
                  onClick={() => deleteReport(selectedReport.id)}
                  disabled={actionLoading && actionLoadingId === selectedReport.id}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading && actionLoadingId === selectedReport.id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Delete Report
                </button>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
          title="Confirm Deletion"
          message={`Are you sure you want to delete this report? This action cannot be undone.`}
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteDialog(false)}
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}
    </div>
  );
} 