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
import { AnnouncementBanner } from '../components/AnnouncementBanner';
import { LikeDetailsModal } from '../components/LikeDetailsModal';
import { ReportsGridSkeleton } from '../components/SkeletonLoader';
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
  
  // Handler for telephone links to prevent errors on desktop
  const handlePhoneClick = (e: React.MouseEvent<HTMLAnchorElement>, phoneNumber: string) => {
    // Check if device has phone calling capabilities
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (!isMobile) {
      // Prevent default tel: link behavior on desktop
      e.preventDefault();
      
      // Copy to clipboard
      navigator.clipboard.writeText(phoneNumber).then(() => {
        // Show toast notification
        alert(`Phone number ${phoneNumber} copied to clipboard!`);
      }).catch(() => {
        // Fallback if clipboard fails
        alert(`Call: ${phoneNumber}`);
      });
    }
    // On mobile, let the default tel: behavior work
  };
  const { user } = useAuthStore();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAnnouncements, setHasAnnouncements] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: 'All',
    status: 'All',
    priority: 'All',
  });
  const [selectedImage, setSelectedImage] = useState<{ url: string; index: number } | null>(null);
  const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>({}); // Track image loading errors
  const [imageIndexById, setImageIndexById] = useState<{ [key: string]: number }>({});
  const [likeLoading, setLikeLoading] = useState<{ [key: string]: boolean }>({});
  const [likeDetailsModal, setLikeDetailsModal] = useState<{ isOpen: boolean; reportId: string; reportTitle: string } | null>(null);
  const loadingRef = React.useRef(false);
  const needsRefetchRef = React.useRef(false);
  const mobileListRef = React.useRef<HTMLDivElement>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullStartYRef = React.useRef<number | null>(null);
  const pullDistanceRef = React.useRef(0);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error'; visible: boolean }>({ text: '', type: 'success', visible: false });

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

  // Detect if there are active announcements so we can adjust layout gracefully
  useEffect(() => {
    const checkAnnouncements = async () => {
      try {
        // Build audience filter based on user role
        const audienceFilters: string[] = ['target_audience.eq.all'];
        if (user?.role === 'user') audienceFilters.push('target_audience.eq.users');
        if (user?.role === 'patrol') audienceFilters.push('target_audience.eq.patrols');
        if (user?.role === 'admin') audienceFilters.push('target_audience.eq.admins');

        const { count, error } = await supabase
          .from('announcements')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true)
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
          .or(audienceFilters.join(','));

        if (error) {
          console.error('Error checking announcements:', error);
          setHasAnnouncements(false);
          return;
        }
        setHasAnnouncements((count || 0) > 0);
      } catch (err) {
        console.error('Unexpected error checking announcements:', err);
        setHasAnnouncements(false);
      }
    };

    checkAnnouncements();
  }, [user]);

  // Debounced server-side filter changes
  useEffect(() => {
    const t = setTimeout(() => {
      fetchReports();
    }, 150);
    return () => clearTimeout(t);
  }, [filters]);

  // Clear filters function
  const clearFilters = () => {
    setSearchTerm('');
    setFilters({
      category: 'All',
      status: 'All',
      priority: 'All',
    });
  };

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

  async function fetchReports() {
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
  }

  // Mobile pull-to-refresh for horizontal list
  useEffect(() => {
    const el = mobileListRef.current;
    if (!el) return;
    const onTouchStart = (e: TouchEvent) => {
      if (el.scrollTop === 0) {
        pullStartYRef.current = e.touches[0].clientY;
        pullDistanceRef.current = 0;
      } else {
        pullStartYRef.current = null;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (pullStartYRef.current !== null) {
        pullDistanceRef.current = Math.max(0, e.touches[0].clientY - pullStartYRef.current);
        const translate = Math.min(60, pullDistanceRef.current * 0.5);
        (el as HTMLElement).style.transform = `translateY(${translate}px)`;
      }
    };
    const onTouchEnd = async () => {
      (el as HTMLElement).style.transform = '';
      if (pullDistanceRef.current > 60) {
        setIsRefreshing(true);
        try {
          await fetchReports();
          setToast({ text: 'Refreshed', type: 'success', visible: true });
        } catch {}
        setIsRefreshing(false);
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 1500);
      }
      pullStartYRef.current = null;
      pullDistanceRef.current = 0;
    };
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart as any);
      el.removeEventListener('touchmove', onTouchMove as any);
      el.removeEventListener('touchend', onTouchEnd as any);
    };
  }, []);

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
      setToast({ text: isLiked ? 'Added like' : 'Removed like', type: 'success', visible: true });
      setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 1200);
      
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
      setToast({ text: 'Failed to update like', type: 'error', visible: true });
      setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 1800);
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

  // Filter reports based on search term and filters
  const filteredReports = reports.filter(report => {
    // Always exclude verifying, awaiting_verification, and rejected reports from the main reports view
    if (report.status === 'verifying' || report.status === 'awaiting_verification' || report.status === 'rejected') {
      return false;
    }
    
    // Category filter
    const categoryMatch = filters.category === 'All' || 
      (report.category || '').toLowerCase().includes(filters.category.toLowerCase().replace(/_/g, ' '));
    
    // Status filter
    const statusMatch = filters.status === 'All' || 
      (report.status || '').toLowerCase() === filters.status.toLowerCase().replace(/\s+/g, '_');
    
    // Priority filter
    const priorityMatch = filters.priority === 'All' || 
      (report.priority || '').toLowerCase() === filters.priority.toLowerCase();
    
    // Search term filter
    const searchMatch = !searchTerm || 
      (report.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (report.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    return categoryMatch && statusMatch && priorityMatch && searchMatch;
  });

  if (loading && reports.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-screen-2xl mx-auto">
          <div className="mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="bg-gray-200 rounded-lg h-20"></div>
              ))}
            </div>
          </div>
          
          <ReportsGridSkeleton />
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-[100dvh] bg-gray-50 reports-page">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-screen-2xl mx-auto">
        {/* Announcement Banner */}
        <div className="mb-6">
          <AnnouncementBanner />
        </div>

        {/* Emergency Contacts Section */}
        <div className="mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Emergency Contacts
            </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 hover:bg-red-100 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-red-900">National Emergency</h4>
                      <p className="text-red-700 text-sm">For immediate assistance</p>
                    </div>
                    <a href="tel:911" onClick={(e) => handlePhoneClick(e, '911')} className="text-red-600 hover:text-red-700 font-bold text-2xl">911</a>
                  </div>
                </div>
                
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 hover:bg-orange-100 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-orange-900">Red Cross</h4>
                      <p className="text-orange-700 text-sm">Medical emergencies</p>
                    </div>
                    <a href="tel:143" onClick={(e) => handlePhoneClick(e, '143')} className="text-orange-600 hover:text-orange-700 font-bold text-2xl">143</a>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 hover:bg-blue-100 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-blue-900">Police</h4>
                      <p className="text-blue-700 text-sm">Police assistance</p>
                    </div>
                    <a href="tel:9117" onClick={(e) => handlePhoneClick(e, '9117')} className="text-blue-600 hover:text-blue-700 font-bold text-2xl">9117</a>
                  </div>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 hover:bg-yellow-100 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-yellow-900">Fire Department</h4>
                      <p className="text-yellow-700 text-sm">Fire emergencies</p>
                    </div>
                    <a href="tel:117" onClick={(e) => handlePhoneClick(e, '117')} className="text-yellow-600 hover:text-yellow-700 font-bold text-2xl">117</a>
                  </div>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 hover:bg-green-100 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-green-900">NDRRMC</h4>
                      <p className="text-green-700 text-sm">Disaster response</p>
                    </div>
                    <a href="tel:0289115061" onClick={(e) => handlePhoneClick(e, '0289115061')} className="text-green-600 hover:text-green-700 font-bold text-lg">(02) 8911-5061</a>
                  </div>
                </div>
                
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 hover:bg-purple-100 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-purple-900">Health Department</h4>
                      <p className="text-purple-700 text-sm">Health emergencies</p>
                    </div>
                    <a href="tel:0287111001" onClick={(e) => handlePhoneClick(e, '0287111001')} className="text-purple-600 hover:text-purple-700 font-bold text-lg">(02) 8711-1001</a>
                  </div>
                </div>
              </div>
            </div>
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
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-sm font-medium transition-colors"
            >
              <Shield className="h-4 w-4" />
              <span>Verification</span>
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
              <span className="text-sm text-gray-500">Access your most common tasks</span>
            </div>
            <QuickActions hideEmergencyActions />
          </div>
        </div>


        {/* Search and Filters Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Reports</h2>
            <span className="text-sm text-gray-500">{filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''} found</span>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search reports by title or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
              >
                {CATEGORIES.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>

              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
              >
                {STATUSES.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>

              <select
                value={filters.priority}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
              >
                {PRIORITIES.map(priority => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>

              {/* Clear Filters Button */}
              {(searchTerm || filters.category !== 'All' || filters.status !== 'All' || filters.priority !== 'All') && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile horizontal swipe list */}
        <div className="md:hidden mb-4">
          <div className="sticky top-[4.5rem] z-10 flex items-center justify-center py-1">
            {isRefreshing && (
              <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-full">
                <svg className="animate-spin h-4 w-4 text-blue-600" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
                Refreshing
              </div>
            )}
          </div>
          <div ref={mobileListRef} className="overflow-x-auto whitespace-nowrap px-2 pb-2 [-webkit-overflow-scrolling:touch] snap-x snap-mandatory">
            <div className="inline-flex gap-3">
              {filteredReports.map((report) => (
                <div key={report.id} className="snap-start w-[85vw] max-w-[380px] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer" onClick={() => navigate(`/reports/${report.id}`)}>
                  {report.images && report.images.length > 0 ? (
                    <img src={report.images[0]} alt={report.title} className="w-full h-40 object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-40 bg-gray-100 flex items-center justify-center"><MapPin className="h-6 w-6 text-gray-400" /></div>
                  )}
                  <div className="p-4">
                    <h3 className="text-base font-semibold text-gray-900 line-clamp-2 mb-2">{report.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">{report.description}</p>
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-semibold ${getStatusColor(report.status)}`}>{report.status.replace('_',' ')}</span>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-semibold ${getPriorityColor(report.priority)}`}>{report.priority}</span>
                    </div>
                  </div>
                </div>
              ))}
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
            className="hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
          >
            {filteredReports.map((report) => (
              <motion.div
                variants={cardVariants}
                key={report.id}
                className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-200 hover:border-gray-300 overflow-hidden hover:-translate-y-1"
                onClick={() => navigate(`/reports/${report.id}`)}
              >
                {report.images && report.images.length > 0 && !imageErrors[report.id] ? (
                  <div className="relative h-48 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                    {(() => {
                      const total = report.images.length;
                      const currentIndex = imageIndexById[report.id] ?? 0;
                      const setIndex = (next: number) => setImageIndexById(prev => ({ ...prev, [report.id]: ((next % total) + total) % total }));
                      return (
                        <>
                          <img
                            src={report.images[currentIndex]}
                            alt={report.title}
                            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                            onError={() => handleImageError(report.id)}
                          />
                          {total > 1 && (
                            <>
                              <button
                                aria-label="Previous image"
                                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-700 rounded-full p-1 shadow z-10"
                                onClick={(e) => { e.stopPropagation(); setIndex(currentIndex - 1); }}
                              >
                                ←
                              </button>
                              <button
                                aria-label="Next image"
                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-700 rounded-full p-1 shadow z-10"
                                onClick={(e) => { e.stopPropagation(); setIndex(currentIndex + 1); }}
                              >
                                →
                              </button>
                              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                                {report.images.map((_, idx) => (
                                  <button
                                    key={idx}
                                    aria-label={`Go to image ${idx + 1}`}
                                    onClick={(e) => { e.stopPropagation(); setIndex(idx); }}
                                    className={`w-2 h-2 rounded-full ${idx === currentIndex ? 'bg-blue-600' : 'bg-gray-300'}`}
                                  />
                                ))}
                              </div>
                            </>
                          )}
                        </>
                      );
                    })()}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </div>
                ) : (
                  <div className="h-48 bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 flex items-center justify-center group-hover:from-gray-100 group-hover:to-gray-200 transition-all duration-300">
                    <div className="text-center">
                      <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2 group-hover:text-gray-500 transition-colors duration-300" />
                      <p className="text-xs text-gray-500 font-medium">No Image</p>
                    </div>
                  </div>
                )}

                <div className="p-6">
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

                  <div className="flex items-center gap-2 mb-4">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold ${getStatusColor(report.status)}`}>
                      {getStatusIcon(report.status)}
                      <span className="ml-1.5">{report.status.replace('_', ' ')}</span>
                    </span>
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold ${getPriorityColor(report.priority)}`}>
                      {report.priority}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm mb-4">
                    <div className="flex items-center gap-2">
                      {report.user_profile?.avatar_url ? (
                        <img 
                          src={report.user_profile.avatar_url} 
                          alt={(report.user_profile as any).first_name || report.user_profile.username || 'User'} 
                          className="w-6 h-6 rounded-full object-cover ring-2 ring-gray-200" 
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-600 text-xs font-semibold">
                          {(((report.user_profile as any).first_name || report.user_profile?.username || 'A') as string).slice(0,1).toUpperCase()}
                        </div>
                      )}
                      <span className="text-gray-700 font-medium truncate max-w-[120px]">{(report.user_profile as any)?.first_name || report.user_profile?.username || 'Anonymous'}</span>
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
      {toast.visible && (
        <div className="fixed bottom-4 left-0 right-0 z-[9999] px-4 flex justify-center">
          <div className={`px-4 py-2 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
            {toast.text}
          </div>
        </div>
      )}
    </div>
    </>
  );
}