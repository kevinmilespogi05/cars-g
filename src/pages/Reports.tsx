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
  Hash,
  Star
} from 'lucide-react';
import { getStatusColor as badgeStatusColor, getStatusIcon as badgeStatusIcon, getPriorityColor as badgePriorityColor } from '../lib/badges';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { QuickActions } from '../components/QuickActions';
import { reportsService } from '../services/reportsService';
import { AnnouncementCarousel } from '../components/AnnouncementCarousel';
import { LikeDetailsModal } from '../components/LikeDetailsModal';
import { Report } from '../types';

// LGU Footer details – update these to your LGU specifics
const LGU_NAME = 'Castillejos Local Government Unit';
const LGU_ADDRESS = 'Municipal Building, San Juan, Castillejos, Zambales, 2208, Philippines';
const LGU_FACEBOOK_URL = 'https://www.facebook.com/profile.php?id=100086396687833';
const LGU_GOOGLE_MAPS_URL = 'https://maps.google.com/?q=Municipal+Building,+San+Juan,+Castillejos,+Zambales,+2208,+Philippines';
const LGU_EMAIL = 'mayorsoffice.jdk2022@gmail.com'; // update if different
const LGU_OFFICE_HOURS = 'Monday–Friday, 8:00 AM – 5:00 PM';

const CATEGORIES = ['All', 'Infrastructure', 'Safety', 'Environmental', 'Public Services', 'Other'];
const STATUSES = ['All', 'Pending', 'In Progress', 'Resolved'];
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

  // Micro-animations: container and card variants
  const gridVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.06, delayChildren: 0.05 }
    }
  } as const;

  const cardVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 24 } }
  } as const;

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
      // Always exclude verifying, awaiting_verification, and rejected reports from the main reports view
      // These should be handled on the verification page or user profile
      if (r.status === 'verifying' || r.status === 'awaiting_verification' || r.status === 'rejected') return false;
      
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
        
        // If status changes to verifying, awaiting_verification, or rejected, remove it from main reports view
        if (newStatus === 'verifying' || newStatus === 'awaiting_verification' || newStatus === 'rejected') {
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

      // Filter out verifying, awaiting_verification, rejected, and cancelled reports from the main reports view
      // These should be handled on the verification page or user profile
      const filteredReportsData = reportsData.filter(report => 
        report.status !== 'verifying' && 
        report.status !== 'awaiting_verification' && 
        report.status !== 'rejected' &&
        report.status !== 'cancelled'
      );

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

  const getStatusIcon = (status: string) => badgeStatusIcon(status);

  const getStatusColor = (status: string) => badgeStatusColor(status);

  const getPriorityColor = (priority: string) => badgePriorityColor(priority);

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
    <>
    <div className="min-h-[100dvh] bg-gradient-to-br from-gray-50 via-white to-gray-100 reports-page">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-screen-2xl mx-auto">
        {/* Announcements with right-side Emergency Contacts only for this section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          <div className="lg:col-span-9">
            <AnnouncementCarousel />
          </div>
          <aside className="lg:col-span-3">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Emergency Contacts
              </h3>
              <ul className="space-y-4 text-sm">
                <li className="flex items-start justify-between group">
                  <div>
                    <p className="font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">National Emergency Hotline</p>
                    <p className="text-gray-500 text-xs">For immediate assistance</p>
                  </div>
                  <a href="tel:911" className="text-red-600 hover:text-red-700 font-bold text-lg hover:scale-110 transition-all duration-200">911</a>
                </li>
                <li className="flex items-start justify-between group">
                  <div>
                    <p className="font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">Philippine Red Cross</p>
                    <p className="text-gray-500 text-xs">Medical emergencies</p>
                  </div>
                  <a href="tel:143" className="text-red-600 hover:text-red-700 font-bold text-lg hover:scale-110 transition-all duration-200">143</a>
                </li>
                <li className="flex items-start justify-between group">
                  <div>
                    <p className="font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">NDRRMC</p>
                    <p className="text-gray-500 text-xs">Disaster response</p>
                  </div>
                  <a href="tel:0289115061" className="text-red-600 hover:text-red-700 font-bold text-sm hover:scale-110 transition-all duration-200">(02) 8911-5061</a>
                </li>
                <li className="flex items-start justify-between group">
                  <div>
                    <p className="font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">Philippine National Police</p>
                    <p className="text-gray-500 text-xs">Police assistance</p>
                  </div>
                  <a href="tel:9117" className="text-red-600 hover:text-red-700 font-bold text-lg hover:scale-110 transition-all duration-200">9117</a>
                </li>
                <li className="flex items-start justify-between group">
                  <div>
                    <p className="font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">Bureau of Fire Protection</p>
                    <p className="text-gray-500 text-xs">Fire emergencies</p>
                  </div>
                  <a href="tel:117" className="text-red-600 hover:text-red-700 font-bold text-lg hover:scale-110 transition-all duration-200">117</a>
                </li>
                <li className="flex items-start justify-between group">
                  <div>
                    <p className="font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">Department of Health</p>
                    <p className="text-gray-500 text-xs">Health emergencies</p>
                  </div>
                  <a href="tel:0287111001" className="text-red-600 hover:text-red-700 font-bold text-sm hover:scale-110 transition-all duration-200">(02) 8711-1001</a>
                </li>
              </ul>
            </div>
          </aside>
        </div>

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link to="/" className="hover:text-gray-700">Home</Link>
            <span>/</span>
            <span className="text-gray-700 font-medium">Reports</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/verification-reports"
              className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-md text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-sm font-medium transition-colors"
            >
              <Shield className="h-4 w-4" />
              <span>Verification</span>
            </Link>
            <Link
              to="/reports/create"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-[#800000] text-white hover:bg-[#6e0000] text-sm font-semibold shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Create report
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <QuickActions hideEmergencyActions />
        </div>

        {/* Search and Filters Section */}
        <div className="bg-white/90 backdrop-blur sticky top-20 z-10 rounded-lg shadow-sm p-4 mb-4 border border-gray-100">
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
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-primary-color focus:border-transparent bg-white"
                />
              </div>
            </div>

            {/* Filters */}
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

        {/* Reports Grid - restored to fuller layout */}
        {filteredReports.length === 0 ? (
          <div className="text-center py-14">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mx-auto mb-4 w-56 h-40 relative"
            >
              {/* Simple empty-state illustration */}
              <svg viewBox="0 0 300 220" className="absolute inset-0 w-full h-full">
                <defs>
                  <linearGradient id="g1" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#f1f5f9" />
                    <stop offset="100%" stopColor="#e2e8f0" />
                  </linearGradient>
                </defs>
                <rect x="0" y="120" width="300" height="80" fill="url(#g1)" rx="14" />
                <rect x="20" y="40" width="180" height="110" fill="#ffffff" rx="14" stroke="#e5e7eb" />
                <rect x="35" y="60" width="120" height="12" fill="#e5e7eb" rx="6" />
                <rect x="35" y="80" width="150" height="10" fill="#eef2f7" rx="5" />
                <rect x="35" y="98" width="100" height="10" fill="#eef2f7" rx="5" />
                <circle cx="230" cy="65" r="18" fill="#fee2e2" />
                <path d="M222 65h16" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
                <path d="M230 57v16" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
              </svg>
              {/* Floating pin */}
              <motion.div
                initial={{ y: -6 }}
                animate={{ y: 0 }}
                transition={{ repeat: Infinity, repeatType: 'reverse', duration: 1.4, ease: 'easeInOut' }}
                className="absolute -top-2 right-10 text-gray-400"
              >
                <MapPin className="h-7 w-7" />
              </motion.div>
            </motion.div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">No reports found</h3>
            <p className="text-sm text-gray-500 mb-4">
              {searchTerm || filters.category !== 'All' || filters.status !== 'All' || filters.priority !== 'All'
                ? 'Try adjusting your search or filters.'
                : 'Be the first to submit a report!'}
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => navigate('/reports/create')}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-[#800000] text-white hover:bg-[#6e0000] text-sm font-semibold shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Create report
              </button>
              {(searchTerm || filters.category !== 'All' || filters.status !== 'All' || filters.priority !== 'All') && (
                <button
                  onClick={() => { setSearchTerm(''); setFilters({ category: 'All', status: 'All', priority: 'All' }); }}
                  className="text-sm text-gray-600 hover:text-gray-800 underline"
                >
                  Reset filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <motion.div
            variants={gridVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
          >
            {filteredReports.map((report) => (
              <motion.div
                variants={cardVariants}
                key={report.id}
                className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 hover:border-gray-200 overflow-hidden hover:-translate-y-1"
                onClick={() => navigate(`/reports/${report.id}`)}
              >
                {report.images && report.images.length > 0 && !imageErrors[report.id] ? (
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={report.images[0]}
                      alt={report.title}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                      onError={() => handleImageError(report.id)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    {report.images.length > 1 && (
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-gray-800 text-xs px-2 py-1 rounded-full font-medium shadow-sm">
                        +{report.images.length - 1} more
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-48 bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 flex items-center justify-center group-hover:from-gray-100 group-hover:to-gray-200 transition-all duration-300">
                    <div className="text-center">
                      <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2 group-hover:text-gray-500 transition-colors duration-300" />
                      <p className="text-xs text-gray-500 font-medium">No Image</p>
                    </div>
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 text-lg leading-tight line-clamp-2 group-hover:text-gray-700 transition-colors duration-200">
                      {report.title}
                    </h3>
                    {report.case_number && (
                      <div className="flex items-center text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg ml-2 flex-shrink-0">
                        <Hash className="h-3 w-3 mr-1" />
                        <span className="font-medium">{report.case_number}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 mb-4">
                    {report.description}
                  </p>

                  <div className="flex items-center gap-2 mb-3">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm ${getStatusColor(report.status)}`}>
                      {getStatusIcon(report.status)}
                      <span className="ml-1.5">{report.status.replace('_', ' ')}</span>
                    </span>
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm ${getPriorityColor(report.priority)}`}>
                      {report.priority}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm mb-4">
                    <div className="flex items-center gap-2">
                      {report.user_profile?.avatar_url ? (
                        <img 
                          src={report.user_profile.avatar_url} 
                          alt={report.user_profile.username || 'User'} 
                          className="w-6 h-6 rounded-full object-cover ring-2 ring-gray-200" 
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-600 text-xs font-semibold">
                          {(report.user_profile?.username || 'A').slice(0,1).toUpperCase()}
                        </div>
                      )}
                      <span className="text-gray-700 font-medium truncate max-w-[120px]">{report.user_profile?.username || 'Anonymous'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Calendar className="h-4 w-4" />
                      <span className="text-xs">{new Date(report.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLike(report.id);
                        }}
                        disabled={likeLoading[report.id]}
                        className="flex items-center gap-1.5 text-sm transition-all duration-200 hover:scale-105 group/like"
                      >
                        {likeLoading[report.id] ? (
                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        ) : (
                          <Heart 
                            className={`h-4 w-4 transition-all duration-200 ${
                              report.is_liked 
                                ? 'fill-red-500 text-red-500 group-hover/like:scale-110' 
                                : 'fill-none text-gray-400 hover:text-red-500 group-hover/like:scale-110'
                            }`} 
                          />
                        )}
                        <span className={`text-xs font-medium ${
                          report.is_liked ? 'text-red-500' : 'text-gray-500'
                        }`}>
                          {report.likes?.count || 0}
                        </span>
                      </button>
                      
                      <div className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-all duration-200 hover:scale-105 group/comment">
                        <MessageCircle className="h-4 w-4 group-hover/comment:scale-110 transition-transform duration-200" />
                        <span className="text-xs font-medium">{report.comments?.count || 0}</span>
                      </div>
                      {typeof (report as any).rating_avg === 'number' && (report as any).rating_count > 0 && (
                        <div className="flex items-center gap-1.5 text-sm text-yellow-700">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-400" />
                          <span className="text-xs font-medium">{(report as any).rating_avg}</span>
                          <span className="text-[11px] text-yellow-700">({(report as any).rating_count})</span>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/reports/${report.id}`);
                      }}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-all duration-200 hover:scale-105 group/view px-2 py-1 rounded-lg hover:bg-gray-50"
                      title="View details"
                    >
                      <Eye className="h-4 w-4 group-hover/view:scale-110 transition-transform duration-200" />
                      <span className="font-medium">View</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="relative max-w-5xl w-full max-h-full p-4 flex items-center justify-center mx-auto">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            >
              <X className="h-8 w-8" />
            </button>
            <img
              src={selectedImage.url}
              alt={`Report image ${selectedImage.index + 1}`}
              className="block mx-auto max-w-full max-h-full object-contain"
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
    {/* Transition to Footer */}
    <div className="h-6 bg-gradient-to-b from-transparent to-[#800000]" />
    {/* LGU Footer */}
    <footer className="bg-[#800000]">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-10 text-base text-white leading-relaxed">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <p className="text-lg md:text-xl font-semibold tracking-wide text-white">{LGU_NAME}</p>
            <p className="text-gray-100 mt-2">{LGU_ADDRESS}</p>
            <div className="flex items-center gap-5 mt-4">
              <a href={LGU_FACEBOOK_URL} target="_blank" rel="noreferrer" className="underline underline-offset-4 font-medium text-white hover:text-gray-200">Facebook</a>
              <a href={LGU_GOOGLE_MAPS_URL} target="_blank" rel="noreferrer" className="underline underline-offset-4 font-medium text-white hover:text-gray-200">Google Maps</a>
            </div>
          </div>
          <div>
            <p className="text-lg md:text-xl font-semibold tracking-wide text-white">Contact</p>
            <ul className="mt-2 space-y-1.5 text-gray-100">
              {LGU_EMAIL && <li>Email: <a href={`mailto:${LGU_EMAIL}`} className="underline underline-offset-4 hover:text-white font-medium">{LGU_EMAIL}</a></li>}
            </ul>
          </div>
          <div>
            <p className="text-lg md:text-xl font-semibold tracking-wide text-white">Office Hours</p>
            <p className="mt-2 text-gray-100">{LGU_OFFICE_HOURS}</p>
            <p className="mt-3 text-gray-200">For emergencies, dial 911 or contact your local responders.</p>
          </div>
        </div>
      </div>
    </footer>
    </>
  );
}