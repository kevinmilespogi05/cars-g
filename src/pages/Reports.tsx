import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { getStatusColor as badgeStatusColor, getStatusIcon as badgeStatusIcon, getPriorityColor as badgePriorityColor } from '../lib/badges';
import { useAuthStore } from '../store/authStore';
import { reportsService } from '../services/reportsService';
import { AnnouncementBanner } from '../components/AnnouncementBanner';
import { LikeDetailsModal } from '../components/LikeDetailsModal';
import { ReportsGridSkeleton } from '../components/SkeletonLoader';
import { SideNav } from '../components/SideNav';
import { EmergencyContacts } from '../components/EmergencyContacts';
import { LGUInfo } from '../components/LGUInfo';
import { ReportsList } from '../components/ReportsList';
import { QuickActions } from '../components/QuickActions';
import { Report } from '../types';

// Note: LGU constants have been moved to LGUInfo component
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

  // Loading state
  if (loading && reports.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
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
    <div className="min-h-[100dvh] bg-gray-50 reports-page">
      {/* 
        Multi-Column Responsive Layout - Full Width Edge-to-Edge
        - Desktop (lg+): 3 columns [sidebar | main content | info panel]
        - Tablet (md): 2 columns [sidebar | main content with info below]
        - Mobile (<md): Single column with optimized order
        - All content stretches to viewport edges
      */}
      <div className="w-full">
        
        {/* 3-Column Grid Layout - No gaps for edge-to-edge design */}
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] lg:grid-cols-[minmax(280px,1fr)_minmax(0,2.5fr)_minmax(280px,1fr)]">
          
          {/* LEFT COLUMN: Sidebar Navigation - Hidden on mobile/tablet, visible on desktop */}
          <aside className="hidden lg:block lg:sticky lg:top-0 lg:self-start lg:order-1 border-r border-gray-200 bg-white min-h-screen py-6 px-4 overflow-y-auto">
            <SideNav />
          </aside>

          {/* CENTER COLUMN: Main Content (Announcements + Reports List) */}
          <main className="order-1 md:order-1 lg:order-2 py-6 px-4 sm:px-6">
            {/* Announcement Banner */}
            <div className="mb-5">
              <AnnouncementBanner />
            </div>

            {/* Reports List with Search & Filters */}
            <ReportsList
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

          {/* RIGHT COLUMN: Emergency Contacts & LGU Info - Shows on tablet/desktop only */}
          <aside className="hidden md:block md:sticky md:top-0 md:self-start md:order-2 lg:order-3 border-l border-gray-200 bg-white min-h-screen py-6 px-4 overflow-y-auto">
            <div className="space-y-5">
              {/* Emergency Contacts */}
              <EmergencyContacts />

              {/* LGU Information */}
              <LGUInfo />
            </div>
          </aside>

          {/* MOBILE ONLY: Emergency Contacts and LGU Info at bottom */}
          <div className="md:hidden order-2 px-4 py-6 space-y-5 border-t border-gray-200">
            {/* Emergency Contacts for Mobile */}
            <EmergencyContacts />

            {/* LGU Info for Mobile */}
            <LGUInfo />
          </div>

        </div>
      </div>

      {/* Mobile Floating Quick Actions Button - Always visible on mobile */}
      <div className="lg:hidden">
        <QuickActions hideEmergencyActions />
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