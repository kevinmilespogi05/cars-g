import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, MapPin, Calendar, User, Heart, MessageCircle, Eye, Clock, CheckCircle, XCircle, AlertTriangle, Loader2, X, Shield } from 'lucide-react';
import { getPriorityColor as badgePriorityColor, getStatusColor as badgeStatusColor } from '../lib/badges';
import { useAuthStore } from '../store/authStore';
import { Report } from '../types';
import { reportsService } from '../services/reportsService';
import { LikeDetailsModal } from '../components/LikeDetailsModal';

const CATEGORIES = ['All', 'Infrastructure', 'Safety', 'Environmental', 'Public Services', 'Other'];
const PRIORITIES = ['All', 'Low', 'Medium', 'High'];

export function VerificationReports() {
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
  const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>({});
  const [likeLoading, setLikeLoading] = useState<{ [key: string]: boolean }>({});
  const [likeDetailsModal, setLikeDetailsModal] = useState<{ isOpen: boolean; reportId: string; reportTitle: string } | null>(null);
  const loadingRef = React.useRef(false);
  const needsRefetchRef = React.useRef(false);

  useEffect(() => {
    const initializeAndFetch = async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      try {
        const optimisticRaw = sessionStorage.getItem('optimisticReport');
        if (optimisticRaw) {
          const optimistic = JSON.parse(optimisticRaw);
          if (optimistic.status === 'awaiting_verification') {
            setReports(prev => {
              if (prev.some(r => r.id === optimistic.id)) return prev;
              return [optimistic, ...prev];
            });
          }
          sessionStorage.removeItem('optimisticReport');
        }
      } catch {}
      await fetchReports();
    };
    
    initializeAndFetch();
  }, [user]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchReports();
    }, 150);
    return () => clearTimeout(t);
  }, [filters]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchReports();
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    console.log('Setting up real-time subscriptions for verification reports');
    
    const matchesFilters = (r: any) => {
      // Only show reports that are verifying or awaiting verification
      if (r.status !== 'verifying' && r.status !== 'awaiting_verification') return false;
      
      // Add null checks for all properties
      const categoryOk = !filters.category || filters.category === 'All' || 
        (r.category && r.category.toLowerCase().includes((filters.category || '').toLowerCase().replace(/_/g, ' ')));
      
      const statusOk = !filters.status || filters.status === 'All' || 
        (r.status && r.status.toLowerCase() === (filters.status || '').toLowerCase().replace(/\s+/g, '_'));
      
      const priorityOk = !filters.priority || filters.priority === 'All' || 
        (r.priority && r.priority.toLowerCase() === (filters.priority || '').toLowerCase());
      
      const searchOk = !searchTerm || 
        (r.title && r.title.toLowerCase().includes(searchTerm.toLowerCase())) || 
        (r.description && r.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return categoryOk && statusOk && priorityOk && searchOk;
    };
    
    const reportsSubscription = reportsService.subscribeToReports((newReport) => {
      console.log('New verification report received:', newReport);
      // Only add reports that are verifying or awaiting verification
      if (newReport.status !== 'verifying' && newReport.status !== 'awaiting_verification') return;
      if (!matchesFilters(newReport)) return;
      setReports(prev => (prev.some(r => r.id === newReport.id) ? prev : [newReport, ...prev]));
    });

    const statusSubscription = reportsService.subscribeToReportStatusChanges((reportId, newStatus) => {
      console.log('Status change received for verification report:', reportId, 'new status:', newStatus);
      if (newStatus !== 'verifying' && newStatus !== 'awaiting_verification') {
        setReports(prev => prev.filter(r => r.id !== reportId));
      } else {
        setReports(prev => {
          const exists = prev.some(r => r.id === reportId);
          if (!exists) {
            fetchReports();
          }
          return prev;
        });
      }
    });

    const likesSubscription = reportsService.subscribeToLikesChanges(async (reportId, likeCount) => {
      console.log('Likes callback triggered for verification report:', reportId, 'count:', likeCount);
      setReports(prev => {
        const updated = prev.map(report => 
          report.id === reportId 
            ? { 
                ...report, 
                likes: { count: likeCount }
              }
            : report
        ).filter(matchesFilters);
        return updated;
      });
    });

    const commentsSubscription = reportsService.subscribeToCommentsChanges((reportId, commentCount) => {
      console.log('Comments callback triggered for verification report:', reportId, 'count:', commentCount);
      setReports(prev => 
        prev.map(report => 
          report.id === reportId 
            ? { ...report, comments: { count: commentCount } }
            : report
        ).filter(matchesFilters)
      );
    });

    return () => {
      if (reportsSubscription) reportsSubscription();
      if (statusSubscription) statusSubscription();
      if (likesSubscription) likesSubscription();
      if (commentsSubscription) commentsSubscription();
    };
  }, [user, filters, searchTerm]);

  // Clean up any reports that don't have verifying or awaiting_verification status
  useEffect(() => {
    const hasInvalidReports = reports.some(report => report.status !== 'verifying' && report.status !== 'awaiting_verification');
    if (hasInvalidReports) {
      setReports(prev => prev.filter(report => report.status === 'verifying' || report.status === 'awaiting_verification'));
    }
  });

  const fallbackImageUrl = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE2IiBmaWxsPSIjODg4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==";

  const fetchReports = async () => {
    try {
      if (loadingRef.current) {
        needsRefetchRef.current = true;
        return;
      }
      setLoading(true);
      loadingRef.current = true;
      
      // Fetch reports with 'verifying' or 'awaiting_verification' status
      const reportsData = await reportsService.getReports({
        category: filters.category,
        status: filters.status === 'All' ? undefined : filters.status,
        priority: filters.priority,
        search: searchTerm,
        limit: 40
      });

      // Double-check: filter to ensure only verifying or awaiting_verification reports are shown
      const filteredReportsData = reportsData.filter(report => report.status === 'verifying' || report.status === 'awaiting_verification');

      setReports(filteredReportsData);
    } catch (error) {
      console.error('Error fetching verification reports:', error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
      if (needsRefetchRef.current) {
        needsRefetchRef.current = false;
        fetchReports();
      }
    }
  };

  const handleLike = async (reportId: string) => {
    if (!user) {
      alert('Please sign in to like reports');
      return;
    }

    setLikeLoading(prev => ({ ...prev, [reportId]: true }));

    try {
      const isLiked = await reportsService.toggleLike(reportId);
      
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

  // Filter reports based on current filters and search
  const filteredReports = reports.filter(report => {
    // Only show reports that are verifying or awaiting verification
    if (report.status !== 'verifying' && report.status !== 'awaiting_verification') return false;
    
    // Add null checks for all properties
    const categoryOk = !filters.category || filters.category === 'All' || 
      (report.category && report.category.toLowerCase().includes((filters.category || '').toLowerCase().replace(/_/g, ' ')));
    
    const statusOk = !filters.status || filters.status === 'All' || 
      (report.status && report.status.toLowerCase() === (filters.status || '').toLowerCase().replace(/\s+/g, '_'));
    
    const priorityOk = !filters.priority || filters.priority === 'All' || 
      (report.priority && report.priority.toLowerCase() === (filters.priority || '').toLowerCase());
    
    const searchOk = !searchTerm || 
      (report.title && report.title.toLowerCase().includes(searchTerm.toLowerCase())) || 
      (report.description && report.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return categoryOk && statusOk && priorityOk && searchOk;
  });

  if (loading && reports.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-primary-color mx-auto mb-4" />
          <p className="text-gray-600">Loading verification reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50 verification-reports-page">
      <div className="w-full px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Shield className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#800000]">Verification Reports</h1>
              <p className="text-sm text-gray-600">Reports being verified or awaiting verification from patrol officers</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/reports')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-600 text-white px-3 py-2 rounded-md shadow-sm hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 text-sm font-medium"
          >
            <Eye className="h-4 w-4" />
            <span>View All Reports</span>
          </button>
        </div>



        {/* Search and Filters Section */}
        <div className="bg-white rounded-lg shadow-sm p-3 mb-4 border border-gray-100">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search verification reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="px-2.5 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
              >
                {CATEGORIES.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>

              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="px-2.5 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
              >
                <option value="All">All Statuses</option>
                <option value="verifying">Verifying</option>
                <option value="awaiting_verification">Awaiting Verification</option>
              </select>

              <select
                value={filters.priority}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                className="px-2.5 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
              >
                {PRIORITIES.map(priority => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Verification Reports Grid */}
        {filteredReports.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-3">
              <Shield className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-base font-medium text-gray-900 mb-2">No verification reports found</h3>
            <p className="text-sm text-gray-500">
              {searchTerm || filters.category !== 'All' || filters.status !== 'All' || filters.priority !== 'All'
                ? 'Try adjusting your search or filters'
                : 'All reports have been verified or are in progress!'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border border-orange-200 hover:border-orange-300"
                onClick={() => navigate(`/reports/${report.id}`)}
              >
                {/* Report Images */}
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
                  <div className="h-32 bg-gradient-to-br from-orange-50 to-orange-100 rounded-t-lg flex items-center justify-center">
                    <MapPin className="h-8 w-8 text-orange-400" />
                  </div>
                )}

                {/* Verification Badge */}
                <div className="absolute top-2 left-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    <Shield className="h-3 w-3 mr-1" />
                    Verify
                  </span>
                </div>

                {/* Report Content */}
                <div className="p-3">
                  <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-1 mb-2">
                    {report.title}
                  </h3>

                  <p className="text-gray-600 text-xs leading-relaxed line-clamp-2 mb-3">
                    {report.description}
                  </p>

                  {/* Priority and Status Badges */}
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${badgePriorityColor(report.priority)}`}>
                      {report.priority}
                    </span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${badgeStatusColor(report.status)}`}>
                      {report.status === 'verifying' ? 'Verifying' : 
                       report.status === 'awaiting_verification' ? 'Awaiting Verification' :
                       report.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Meta Information */}
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2.5">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span className="truncate max-w-[80px]">{report.user_profile?.username || 'Anonymous'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400">
                      <Calendar className="h-3 w-3" />
                      <span className="text-xs">{new Date(report.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Actions */}
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
                      className="text-orange-600 hover:text-orange-700 transition-colors p-1 rounded hover:bg-orange-50"
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
