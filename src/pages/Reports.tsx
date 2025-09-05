import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Filter, 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  FileText,
  TrendingUp,
  Users,
  Award,
  Loader2,
  Heart,
  MessageCircle,
  Eye,
  X,
  Shield,
  Calendar,
  XCircle,
  Hash
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { QuickActions } from '../components/QuickActions';
import { reportsService } from '../services/reportsService';
import { AnnouncementCarousel } from '../components/AnnouncementCarousel';
import { LikeDetailsModal } from '../components/LikeDetailsModal';
import { Report } from '../types';

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
  const loadingRef = React.useRef(false);
  const needsRefetchRef = React.useRef(false);

  useEffect(() => {
    // Wait for auth to be initialized before fetching reports
    const initializeAndFetch = async () => {
      // Wait for auth to be established
      await new Promise(resolve => setTimeout(resolve, 500));
      // Optimistic pre-pend if we have a freshly created report
      try {
        const optimisticRaw = sessionStorage.getItem('optimisticReport');
        if (optimisticRaw) {
          const optimistic = JSON.parse(optimisticRaw);
          setReports(prev => {
            if (prev.some(r => r.id === optimistic.id)) return prev;
            return [optimistic, ...prev];
          });
          sessionStorage.removeItem('optimisticReport');
        }
      } catch {}
      await fetchReports();
    };
    
    initializeAndFetch();
  }, [user]); // run on mount and when user changes

  // Debounced server-side filter changes
  useEffect(() => {
    const t = setTimeout(() => {
      fetchReports();
    }, 150);
    return () => clearTimeout(t);
  }, [filters]);

  // Debounced server-side search
  useEffect(() => {
    const t = setTimeout(() => {
      fetchReports();
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Real-time subscriptions for live updates
  useEffect(() => {
    console.log('Setting up real-time subscriptions');
    
    const matchesFilters = (r: any) => {
      // Always exclude verifying and awaiting_verification reports from the main reports view
      // These should be handled on the verification page
      if (r.status === 'verifying' || r.status === 'awaiting_verification') return false;
      
      const categoryOk = filters.category === 'All' || (r.category || '').toLowerCase().includes(filters.category.toLowerCase().replace(/_/g, ' '));
      const statusOk = filters.status === 'All' || (r.status || '').toLowerCase() === filters.status.toLowerCase().replace(/\s+/g, '_');
      const priorityOk = filters.priority === 'All' || (r.priority || '').toLowerCase() === filters.priority.toLowerCase();
      const searchOk = !searchTerm || ((r.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || (r.description || '').toLowerCase().includes(searchTerm.toLowerCase()));
      return categoryOk && statusOk && priorityOk && searchOk;
    };
    
    // Subscribe to new reports
    const reportsSubscription = reportsService.subscribeToReports((newReport) => {
      console.log('New report received:', newReport);
      if (!matchesFilters(newReport)) return;
      setReports(prev => (prev.some(r => r.id === newReport.id) ? prev : [newReport, ...prev]));
    });

    // Subscribe to report status changes
    const statusSubscription = reportsService.subscribeToReportStatusChanges((reportId, newStatus) => {
      console.log('Status change received for report:', reportId, 'new status:', newStatus);
      setReports(prev => {
        const exists = prev.some(r => r.id === reportId);
        
        // If status changes to verifying or awaiting_verification, remove it from main reports view
        if (newStatus === 'verifying' || newStatus === 'awaiting_verification') {
          return prev.filter(r => r.id !== reportId);
        }
        
        const next = prev.map(r => r.id === reportId ? { ...r, status: newStatus as Report['status'] } : r);
        const updated = next.filter(matchesFilters);
        if (!exists && updated.length === next.length) {
          fetchReports();
        }
        return updated;
      });
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
              }
            : report
        ).filter(matchesFilters);
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
        ).filter(matchesFilters)
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
  }, [user, filters, searchTerm]); // react to user, filters and search changes

  // Create a fallback image data URL
  const fallbackImageUrl = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE2IiBmaWxsPSIjODg4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==";

  const fetchReports = async () => {
    try {
      if (loadingRef.current) {
        needsRefetchRef.current = true;
        return;
      }
      setLoading(true);
      loadingRef.current = true;
      
      // Use the optimized reports service
      const reportsData = await reportsService.getReports({
        category: filters.category,
        status: filters.status,
        priority: filters.priority,
        search: searchTerm,
        limit: 40
      });

      // Filter out verifying and awaiting_verification reports from the main reports view
      // These should be handled on the verification page
      const filteredReportsData = reportsData.filter(report => report.status !== 'verifying' && report.status !== 'awaiting_verification');

      setReports(filteredReportsData);
    } catch (error) {
      console.error('Error fetching reports:', error);
      // Could show error toast here
    } finally {
      setLoading(false);
      loadingRef.current = false;
      if (needsRefetchRef.current) {
        needsRefetchRef.current = false;
        // Run the latest params immediately
        fetchReports();
      }
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
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
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

  const filteredReports = reports;

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
    <div className="min-h-[100dvh] bg-gray-50 reports-page">
      <div className="w-full px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {/* Announcements Section */}
        <AnnouncementCarousel />
        {/* Header Section - More compact */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-[#800000]">Reports</h1>
            <Link
              to="/verification-reports"
              className="flex items-center gap-2 text-orange-600 hover:text-orange-700 text-sm font-medium hover:underline"
            >
              <Shield className="h-4 w-4" />
              <span>Verification Reports</span>
            </Link>
          </div>
          <Link
            to="/reports/create"
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary-color text-white px-3 py-2 rounded-md shadow-sm hover:bg-primary-dark transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-color text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Report</span>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <QuickActions />
        </div>

        {/* Status Quick Links */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Status Filters</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilters(prev => ({ ...prev, status: 'Pending' }))}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 transition-colors"
            >
              <Clock className="h-4 w-4" />
              <span>Pending</span>
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, status: 'In Progress' }))}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors"
            >
              <AlertCircle className="h-4 w-4" />
              <span>In Progress</span>
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, status: 'Resolved' }))}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-green-100 text-green-800 rounded-md hover:bg-green-200 transition-colors"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Resolved</span>
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, status: 'Rejected' }))}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-red-100 text-red-800 rounded-md hover:bg-red-200 transition-colors"
            >
              <XCircle className="h-4 w-4" />
              <span>Rejected</span>
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, status: 'All' }))}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
            >
              <Filter className="h-4 w-4" />
              <span>All Reports</span>
            </button>
          </div>
        </div>

        {/* Search and Filters Section - More compact and user-friendly */}
        <div className="bg-white rounded-lg shadow-sm p-3 mb-4 border border-gray-100">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-primary-color focus:border-transparent"
                />
              </div>
            </div>

            {/* Filters - More compact and touch-friendly */}
            <div className="flex flex-wrap gap-2">
              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="px-2.5 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-primary-color focus:border-transparent bg-white"
              >
                {CATEGORIES.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>

              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="px-2.5 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-primary-color focus:border-transparent bg-white"
              >
                {STATUSES.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>

              <select
                value={filters.priority}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                className="px-2.5 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-primary-color focus:border-transparent bg-white"
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
          <div className="text-center py-8">
            <div className="text-gray-400 mb-3">
              <Filter className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-base font-medium text-gray-900 mb-2">No reports found</h3>
            <p className="text-sm text-gray-500">
              {searchTerm || filters.category !== 'All' || filters.status !== 'All' || filters.priority !== 'All'
                ? 'Try adjusting your search or filters'
                : 'Be the first to submit a report!'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border border-gray-100 hover:border-gray-200"
                onClick={() => navigate(`/reports/${report.id}`)}
              >
                {/* Report Images - Much smaller and more compact */}
                {report.images && report.images.length > 0 && !imageErrors[report.id] ? (
                  <div className="relative h-32 overflow-hidden rounded-t-lg">
                    <img
                      src={report.images[0]}
                      alt={report.title}
                      className="w-full h-full object-cover object-center"
                      onError={() => handleImageError(report.id)}
                    />
                    {report.images.length > 1 && (
                      <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
                        +{report.images.length - 1}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-32 bg-gradient-to-br from-gray-50 to-gray-100 rounded-t-lg flex items-center justify-center">
                    <MapPin className="h-8 w-8 text-gray-400" />
                  </div>
                )}

                {/* Report Content - More compact padding and typography */}
                <div className="p-3">
                  {/* Title - Single line with better typography */}
                  <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-1 mb-2">
                    {report.title}
                  </h3>
                  
                  {/* Case Number */}
                  {report.case_number && (
                    <div className="flex items-center text-xs text-gray-500 mb-2">
                      <Hash className="h-3 w-3 mr-1" />
                      <span>Case #{report.case_number}</span>
                    </div>
                  )}

                  {/* Description - Shorter, more readable */}
                  <p className="text-gray-600 text-xs leading-relaxed line-clamp-2 mb-3">
                    {report.description}
                  </p>

                  {/* Status and Priority - More compact badges */}
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                      {getStatusIcon(report.status)}
                      <span className="ml-1 text-xs">{report.status.replace('_', ' ')}</span>
                    </span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(report.priority)}`}>
                      {report.priority}
                    </span>
                  </div>

                  {/* Meta Information - More compact layout */}
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2.5">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span className="truncate max-w-[80px]">{report.user_profile?.username || 'Anonymous'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400">
                      <Calendar className="h-3 w-3" />
                      <span className="text-xs">{new Date(report.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Actions - More compact and touch-friendly */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLike(report.id);
                          }}
                          disabled={likeLoading[report.id]}
                          className="flex items-center gap-1 text-xs transition-colors hover:text-red-500"
                        >
                          {likeLoading[report.id] ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-500" />
                          ) : (
                            <Heart 
                              className={`h-3.5 w-3.5 transition-all duration-200 ${
                                report.is_liked 
                                  ? 'fill-red-500 text-red-500' 
                                  : 'fill-none text-gray-500 hover:text-red-500'
                              }`} 
                            />
                          )}
                          <span className="text-xs text-gray-600">{report.likes?.count || 0}</span>
                        </button>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span>{report.comments?.count || 0}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/reports/${report.id}`);
                      }}
                      className="text-primary-color hover:text-primary-dark transition-colors p-1 rounded hover:bg-gray-50"
                      title="View details"
                    >
                      <Eye className="h-3.5 w-3.5" />
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