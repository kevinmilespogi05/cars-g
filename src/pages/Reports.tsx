import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, MapPin, Calendar, User, Heart, MessageCircle, Eye, Clock, CheckCircle, XCircle, AlertTriangle, Loader2, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Report } from '../types';
import { reportsService } from '../services/reportsService';
import { supabase } from '../lib/supabase';
import { LikeDetailsModal } from '../components/LikeDetailsModal';

const CATEGORIES = ['All', 'Infrastructure', 'Safety', 'Environmental', 'Public Services', 'Other'];
const STATUSES = ['All', 'Pending', 'In Progress', 'Resolved', 'Rejected'];
const PRIORITIES = ['All', 'Low', 'Medium', 'High'];

export function Reports() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: 'All',
    status: 'All',
    priority: 'All',
  });
  const [selectedImage, setSelectedImage] = useState<{ url: string; index: number } | null>(null);
  const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>({}); // Track image loading errors
  const [likeLoading, setLikeLoading] = useState<{ [key: string]: boolean }>({});
  const [likeDetailsModal, setLikeDetailsModal] = useState<{ isOpen: boolean; reportId: string; reportTitle: string } | null>(null);

  useEffect(() => {
    // Wait for auth to be initialized before fetching reports
    const initializeAndFetch = async () => {
      // Wait for auth to be established
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchReports();
    };
    
    initializeAndFetch();
  }, [filters, user]); // Add user as dependency

  // Real-time subscriptions for live updates
  useEffect(() => {
    console.log('Setting up real-time subscriptions');
    
    // Subscribe to new reports
    const reportsSubscription = reportsService.subscribeToReports((newReport) => {
      console.log('New report received:', newReport);
      setReports(prev => {
        // Check if report already exists
        if (prev.some(r => r.id === newReport.id)) {
          return prev;
        }
        // Add new report at the beginning
        return [newReport, ...prev];
      });
    });

    // Subscribe to report status changes
    const statusSubscription = reportsService.subscribeToReportStatusChanges((reportId, newStatus) => {
      console.log('Status change received for report:', reportId, 'new status:', newStatus);
      setReports(prev => 
        prev.map(report => 
          report.id === reportId 
            ? { ...report, status: newStatus as Report['status'] }
            : report
        )
      );
    });

    // Subscribe to likes changes with better error handling
    const likesSubscription = reportsService.subscribeToLikesChanges(async (reportId, likeCount) => {
      console.log('Likes callback triggered for report:', reportId, 'count:', likeCount);
      console.log('Current reports state before update:', reports);
      
      // Only update the like count, preserve the current user's like status
      setReports(prev => {
        const updated = prev.map(report => 
          report.id === reportId 
            ? { 
                ...report, 
                likes: { count: likeCount }
                // Don't update is_liked here - it should be updated by the handleLike function
                // or by the initial fetchReports call
              }
            : report
        );
        console.log('Updated reports state:', updated);
        return updated;
      });
    });

    // Subscribe to comments changes
    const commentsSubscription = reportsService.subscribeToCommentsChanges((reportId, commentCount) => {
      console.log('Comments callback triggered for report:', reportId, 'count:', commentCount);
      setReports(prev => 
        prev.map(report => 
          report.id === reportId 
            ? { ...report, comments: { count: commentCount } }
            : report
        )
      );
    });

    console.log('All subscriptions set up successfully');

    return () => {
      console.log('Cleaning up subscriptions');
      if (reportsSubscription) reportsSubscription();
      if (statusSubscription) statusSubscription();
      if (likesSubscription) likesSubscription();
      if (commentsSubscription) commentsSubscription();
    };
  }, [user]); // Add user as dependency so subscription updates when user changes

  // Create a fallback image data URL
  const fallbackImageUrl = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE2IiBmaWxsPSIjODg4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==";

  const fetchReports = async () => {
    try {
      setLoading(true);
      
      // Use the optimized reports service
      const reportsData = await reportsService.getReports({
        category: filters.category,
        status: filters.status,
        priority: filters.priority,
        search: searchTerm
      });

      setReports(reportsData);
    } catch (error) {
      console.error('Error fetching reports:', error);
      // Could show error toast here
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (reportId: string) => {
    console.log('handleLike called, user:', user?.id, 'reportId:', reportId);
    if (!user) {
      console.log('User not authenticated, returning');
      alert('Please sign in to like reports');
      return;
    }

    setLikeLoading(prev => ({ ...prev, [reportId]: true }));

    try {
      console.log('Calling reportsService.toggleLike for report:', reportId);
      const isLiked = await reportsService.toggleLike(reportId);
      console.log('Toggle like result:', isLiked);
      
      // Update both is_liked status and like count immediately for better UX
      setReports(prev => {
        const updated = prev.map(report => 
          report.id === reportId 
            ? { 
                ...report, 
                is_liked: isLiked,
                likes: { 
                  count: isLiked 
                    ? (report.likes?.count || 0) + 1 
                    : Math.max(0, (report.likes?.count || 0) - 1)
                }
              }
            : report
        );
        console.log('Updated reports after like toggle:', updated);
        return updated;
      });
    } catch (error) {
      console.error('Error toggling like:', error);
      alert('Failed to like/unlike report. Please try again.');
    } finally {
      setLikeLoading(prev => ({ ...prev, [reportId]: false }));
    }
  };

  const handleImageError = (reportId: string) => {
    setImageErrors(prev => ({ ...prev, [reportId]: true }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'in_progress':
        return <AlertTriangle className="w-4 h-4 text-blue-500" />;
      case 'resolved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

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

  const filteredReports = reports.filter(report => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        report.title.toLowerCase().includes(searchLower) ||
        report.description.toLowerCase().includes(searchLower) ||
        report.category.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  if (loading && reports.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-primary-color mx-auto mb-4" />
          <p className="text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 reports-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#800000]">Reports</h1>
          <Link
            to="/reports/create"
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary-color text-white px-4 py-2.5 rounded-lg shadow hover:bg-primary-dark transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-color"
          >
            <Plus className="h-5 w-5" />
            <span>Create New Report</span>
          </Link>
        </div>

        {/* Search and Filters Section */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-color focus:border-transparent"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-color focus:border-transparent"
              >
                {CATEGORIES.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>

              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-color focus:border-transparent"
              >
                {STATUSES.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>

              <select
                value={filters.priority}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-color focus:border-transparent"
              >
                {PRIORITIES.map(priority => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Reports Grid */}
        {filteredReports.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Filter className="h-16 w-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
            <p className="text-gray-500">
              {searchTerm || filters.category !== 'All' || filters.status !== 'All' || filters.priority !== 'All'
                ? 'Try adjusting your search or filters'
                : 'Be the first to submit a report!'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/reports/${report.id}`)}
              >
                {/* Report Images */}
                {report.images && report.images.length > 0 && !imageErrors[report.id] ? (
                  <div className="relative h-48 overflow-hidden rounded-t-lg">
                    <img
                      src={report.images[0]}
                      alt={report.title}
                      className="w-full h-full object-cover"
                      onError={() => handleImageError(report.id)}
                    />
                    {report.images.length > 1 && (
                      <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                        +{report.images.length - 1}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-48 bg-gray-100 rounded-t-lg flex items-center justify-center">
                    <MapPin className="h-12 w-12 text-gray-400" />
                  </div>
                )}

                {/* Report Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 line-clamp-2 flex-1">
                      {report.title}
                    </h3>
                  </div>

                  <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                    {report.description}
                  </p>

                  {/* Status and Priority */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                      {getStatusIcon(report.status)}
                      <span className="ml-1">{report.status.replace('_', ' ')}</span>
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(report.priority)}`}>
                      {report.priority}
                    </span>
                  </div>

                  {/* Meta Information */}
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{report.user_profile?.username || 'Anonymous'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(report.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLike(report.id);
                          }}
                          disabled={likeLoading[report.id]}
                          className="flex items-center gap-1 text-sm transition-colors"
                        >
                          {likeLoading[report.id] ? (
                            <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                          ) : (
                            <Heart 
                              className={`h-4 w-4 transition-all duration-200 ${
                                report.is_liked 
                                  ? 'fill-red-500 text-red-500' 
                                  : 'fill-none text-gray-500 hover:text-red-500'
                              }`} 
                            />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (report.likes?.count && report.likes.count > 0) {
                              setLikeDetailsModal({
                                isOpen: true,
                                reportId: report.id,
                                reportTitle: report.title
                              });
                            }
                          }}
                          className={`text-sm transition-colors ${
                            report.likes?.count && report.likes.count > 0
                              ? 'text-gray-700 hover:text-gray-900 cursor-pointer'
                              : 'text-gray-400 cursor-default'
                          }`}
                          disabled={!report.likes?.count || report.likes.count === 0}
                        >
                          {report.likes?.count || 0}
                        </button>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <MessageCircle className="h-4 w-4" />
                        <span>{report.comments?.count || 0}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/reports/${report.id}`);
                      }}
                      className="text-primary-color hover:text-primary-dark transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="relative max-w-4xl max-h-full p-4">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            >
              <X className="h-8 w-8" />
            </button>
            <img
              src={selectedImage.url}
              alt={`Report image ${selectedImage.index + 1}`}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      )}

      {/* Like Details Modal */}
      {likeDetailsModal && (
        <LikeDetailsModal
          isOpen={likeDetailsModal.isOpen}
          onClose={() => setLikeDetailsModal(null)}
          reportId={likeDetailsModal.reportId}
          reportTitle={likeDetailsModal.reportTitle}
        />
      )}
    </div>
  );
}