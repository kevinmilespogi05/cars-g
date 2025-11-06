import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Shield, FileText } from 'lucide-react';
import { getStatusColor as badgeStatusColor, getStatusIcon as badgeStatusIcon, getPriorityColor as badgePriorityColor } from '../lib/badges';
import { useAuthStore } from '../store/authStore';
import { reportsService } from '../services/reportsService';
import { LikeDetailsModal } from '../components/LikeDetailsModal';
import { ReportsGridSkeleton } from '../components/SkeletonLoader';
import { ReportsList } from '../components/ReportsList';
import { QuickActions } from '../components/QuickActions';
import { ImageViewer } from '../components/ImageViewer';
import { Report } from '../types';

// Note: Filter constants (CATEGORIES, STATUSES, PRIORITIES) have been moved to ReportsList component

export function Reports() {
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

  // Real-time subscriptions for live updates
  useEffect(() => {
    console.log('Setting up real-time subscriptions');
    
    const matchesFilters = (r: any) => {
      // Always exclude verifying, awaiting_verification, and declined reports from the main reports view
      // These should be handled on the verification page or user profile
      // Exclude verifying, awaiting_verification, declined, and rejected reports
      const status = r.status?.toLowerCase();
      if (status === 'verifying' || status === 'awaiting_verification' || status === 'declined' || status === 'rejected') return false;
      
      const categoryOk = filters.category === 'All' || (r.category || '').toLowerCase().includes(filters.category.toLowerCase().replace(/_/g, ' '));
      // Status filter - handle "Declined" filter to match both "declined" and "rejected"
      const normalizedFilterStatus = filters.status?.toLowerCase().replace(/\s+/g, '_');
      const reportStatus = (r.status || '').toLowerCase();
      const statusOk = filters.status === 'All' || 
        (normalizedFilterStatus === 'declined' 
          ? (reportStatus === 'declined' || reportStatus === 'rejected')
          : reportStatus === normalizedFilterStatus);
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
        
        // If status changes to verifying, awaiting_verification, or declined, remove it from main reports view
        // Block transitioning to verifying, awaiting_verification, declined, or rejected
        const normalizedStatus = newStatus?.toLowerCase();
        if (normalizedStatus === 'verifying' || normalizedStatus === 'awaiting_verification' || normalizedStatus === 'declined' || normalizedStatus === 'rejected') {
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

      // Filter out verifying, awaiting_verification, declined, and cancelled reports from the main reports view
      // These should be handled on the verification page or user profile
      const filteredReportsData = reportsData.filter(report => {
        const status = report.status?.toLowerCase();
        return status !== 'verifying' && 
               status !== 'awaiting_verification' && 
               status !== 'declined' &&
               status !== 'rejected' &&
               status !== 'cancelled';
      });

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

  // Loading state
  if (loading && reports.length === 0) {
    return (
      <div className="min-h-screen bg-primary-50/40 backdrop-blur-sm">
        <div className="w-full">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] lg:grid-cols-[minmax(280px,1fr)_minmax(0,2.5fr)_minmax(280px,1fr)]">
            {/* Left sidebar skeleton */}
            <aside className="hidden lg:block border-r border-gray-200 bg-white py-6 px-4">
              <div className="space-y-5">
                <div className="bg-gray-100 rounded-xl h-20 animate-pulse"></div>
                <div className="bg-gray-100 rounded-xl h-64 animate-pulse"></div>
                <div className="bg-gray-100 rounded-xl h-32 animate-pulse"></div>
              </div>
            </aside>
            
            {/* Main content skeleton */}
            <main className="py-6 px-4 sm:px-6">
              <div className="mb-5">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="bg-gray-200 rounded-lg h-20"></div>
                  ))}
                </div>
              </div>
              
              <ReportsGridSkeleton />
            </main>
            
            {/* Right sidebar skeleton */}
            <aside className="hidden md:block border-l border-gray-200 bg-white py-6 px-4">
              <div className="space-y-5">
                <div className="bg-gray-100 rounded-xl h-48 animate-pulse"></div>
                <div className="bg-gray-100 rounded-xl h-32 animate-pulse"></div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-[100dvh] reports-page bg-primary-50/40 backdrop-blur-sm">
      {/* 
        Multi-Column Responsive Layout - Full Width Edge-to-Edge
        - Desktop (lg+): 2 columns [sidebar | main content]
        - Tablet/Mobile (<lg): Single column with emergency contacts at bottom
        - All content stretches to viewport edges
      */}
      <div className="w-full">
        
        {/* Reports Dashboard - Clean Layout */}
        <div className="w-full py-6 px-4 sm:px-6">
          
          {/* MAIN CONTENT: Reports Section */}
          <main className="max-w-7xl mx-auto">
            {/* Reports Section Header - Enhanced */}
            <div className="mb-8 pb-6 border-b-2 border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-3 flex items-center gap-3 animate-fade-in">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                      <FileText className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                    </div>
                    Reports Dashboard
                  </h1>
                  <p className="text-base sm:text-lg text-gray-600 ml-1">
                    View, manage, and track all community reports
                  </p>
                </div>
                {/* Quick Stats Badge */}
                <div className="hidden sm:block">
                  <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 shadow-sm">
                    <div className="text-xs text-gray-600 font-medium">Total Reports</div>
                    <div className="text-2xl font-bold text-blue-600">{reports.length}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reports List with Search & Filters */}
            <ReportsList
              afterSearchContent={
                user && (
                  <div className="mb-5">
                    <Link
                      to="/verification-reports"
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-primary-700 bg-primary-100 hover:bg-secondary-100 border border-primary-200 transition-all shadow-sm hover:shadow-md"
                    >
                      <Shield className="h-5 w-5 text-primary-600" />
                      <span className="text-sm font-semibold">Verification Reports</span>
                    </Link>
                  </div>
                )
              }
              reports={reports}
              loading={loading}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filters={filters}
              setFilters={setFilters}
              handleLike={handleLike}
              likeLoading={likeLoading}
              imageIndexById={imageIndexById}
              setImageIndexById={setImageIndexById}
              imageErrors={imageErrors}
              handleImageError={handleImageError}
              getStatusColor={getStatusColor}
              getStatusIcon={getStatusIcon}
              getPriorityColor={getPriorityColor}
              mobileListRef={mobileListRef}
              isRefreshing={isRefreshing}
            />
          </main>

        </div>
      </div>

      {/* Mobile Floating Quick Actions Button - Always visible on mobile */}
      <div className="lg:hidden">
        <QuickActions hideEmergencyActions />
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <ImageViewer
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          imageUrl={selectedImage.url}
          alt={`Report image ${selectedImage.index + 1}`}
        />
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
          <div className={`px-4 py-2 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-success text-white' : 'bg-danger text-white'}`}>
            {toast.text}
          </div>
        </div>
      )}
    </div>
    </>
  );
}