import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, AlertCircle, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useImageViewerStore } from '../store/imageViewerStore';

interface Announcement {
  id: string;
  title: string;
  content: string;
  image_url?: string; // can be a comma-separated list for multiple images
  priority: 'low' | 'normal' | 'high' | 'urgent';
  target_audience: 'all' | 'users' | 'patrols' | 'admins';
  created_at: string;
  expires_at?: string;
}

interface AnnouncementCarouselProps {
  className?: string;
}

export function AnnouncementCarousel({ className = '' }: AnnouncementCarouselProps) {
  const { user } = useAuthStore();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullStartYRef = useRef<number | null>(null);
  const pullDistanceRef = useRef(0);
  const { isImageViewerOpen, setIsImageViewerOpen } = useImageViewerStore();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [imageIndex, setImageIndex] = useState(0);

  // Minimum distance for swipe
  const minSwipeDistance = 50;

  useEffect(() => {
    fetchAnnouncements();
  }, [user]);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching announcements:', error);
        return;
      }

      // Filter announcements based on user role and target audience
      const filteredAnnouncements = data?.filter(announcement => {
        if (announcement.target_audience === 'all') return true;
        if (!user) return false;
        
        switch (announcement.target_audience) {
          case 'users':
            return user.role === 'user';
          case 'patrols':
            return user.role === 'patrol';
          case 'admins':
            return user.role === 'admin';
          default:
            return true;
        }
      }) || [];

      setAnnouncements(filteredAnnouncements);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'normal':
        return <Info className="w-4 h-4 text-blue-500" />;
      case 'low':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'high':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'normal':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'low':
        return 'bg-green-50 border-green-200 text-green-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const nextAnnouncement = () => {
    setCurrentIndex((prev) => (prev + 1) % announcements.length);
  };

  const prevAnnouncement = () => {
    setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      nextAnnouncement();
    } else if (isRightSwipe) {
      prevAnnouncement();
    }
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  // Reset per-announcement image index when changing announcements
  useEffect(() => {
    setImageIndex(0);
  }, [currentIndex]);

  // Mobile pull-to-refresh for announcements
  useEffect(() => {
    const el = containerRef.current;
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
        await fetchAnnouncements();
        setIsRefreshing(false);
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
  }, [fetchAnnouncements]);

  if (loading) {
    return null;
  }

  if (!isVisible || announcements.length === 0) {
    return null;
  }

  const currentAnnouncement = announcements[currentIndex];
  const imageUrls = (currentAnnouncement.image_url || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div ref={containerRef} className={`bg-white border border-gray-200 rounded-lg shadow-sm mb-4 ${className}`}>
      <div className="relative">
        {/* Toast for refresh success */}
        {isRefreshing && (
          <div className="absolute top-2 left-0 right-0 flex justify-center pointer-events-none">
            <div className="px-3 py-1 rounded-full bg-blue-600 text-white text-xs shadow">Refreshing…</div>
          </div>
        )}
        {/* Pull-to-refresh indicator */}
        {isRefreshing && (
          <div className="sticky top-0 z-10 flex items-center justify-center py-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-full">
              <svg className="animate-spin h-4 w-4 text-blue-600" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
              Refreshing
            </div>
          </div>
        )}
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 z-10 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close announcements"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Navigation arrows */}
        {announcements.length > 1 && (
          <>
            <button
              onClick={prevAnnouncement}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 p-1 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full shadow-sm transition-all"
              aria-label="Previous announcement"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={nextAnnouncement}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 p-1 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full shadow-sm transition-all"
              aria-label="Next announcement"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </>
        )}

        {/* Announcement content */}
        <div
          ref={carouselRef}
          className="p-4 pr-8"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="space-y-3">
            {/* Announcement title label */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] tracking-wide font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                ANNOUNCEMENT
              </span>
            </div>
            {/* Header with priority */}
            <div className="flex items-baseline gap-2">
              {getPriorityIcon(currentAnnouncement.priority)}
              <h3 className="font-semibold text-gray-900 text-base">
                {currentAnnouncement.title}
              </h3>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(currentAnnouncement.priority)}`}>
                {currentAnnouncement.priority}
              </span>
            </div>
              
            {/* Image display */}
            {imageUrls.length > 0 && (
              <div className="relative w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100 flex items-center justify-center min-h-40 sm:min-h-48 md:min-h-56 lg:min-h-[420px] xl:min-h-[520px]">
                <img
                  src={imageUrls[imageIndex]}
                  alt={currentAnnouncement.title}
                  className="max-w-full h-auto object-contain bg-white max-h-40 sm:max-h-48 md:max-h-56 lg:max-h-[420px] xl:max-h-[520px] cursor-zoom-in"
                  onClick={() => { setIsImageViewerOpen(true); setLightboxIndex(imageIndex); }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const container = target.parentElement;
                    if (container) {
                      container.innerHTML = `
                        <div class="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500">
                          <div class="text-center">
                            <svg class="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                            <p class="text-sm">Image unavailable</p>
                          </div>
                        </div>
                      `;
                    }
                  }}
                />
                {imageUrls.length > 1 && (
                  <>
                    <button
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-700 rounded-full p-1 shadow"
                      onClick={(e) => { e.stopPropagation(); setImageIndex((imageIndex - 1 + imageUrls.length) % imageUrls.length); }}
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-700 rounded-full p-1 shadow"
                      onClick={(e) => { e.stopPropagation(); setImageIndex((imageIndex + 1) % imageUrls.length); }}
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                      {imageUrls.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={(e) => { e.stopPropagation(); setImageIndex(idx); }}
                          className={`w-2 h-2 rounded-full ${idx === imageIndex ? 'bg-blue-600' : 'bg-gray-300'}`}
                          aria-label={`Go to image ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            
            {/* Content */}
            <p className="text-gray-700 text-sm leading-relaxed font-bold">
              {currentAnnouncement.content}
            </p>
            
            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                {new Date(currentAnnouncement.created_at).toLocaleDateString()}
              </span>
              {announcements.length > 1 && (
                <div className="flex items-center gap-1">
                  {announcements.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentIndex(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentIndex ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                      aria-label={`Go to announcement ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox for image */}
      {isImageViewerOpen && imageUrls.length > 0 && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 z-[99999] bg-black flex items-center justify-center p-4"
          onClick={() => setIsImageViewerOpen(false)}
          style={{ margin: 0, padding: '1rem' }}
        >
          <button
            aria-label="Close full image"
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              setIsImageViewerOpen(false);
            }}
          >
            <X className="w-6 h-6" />
          </button>
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <img
              src={imageUrls[lightboxIndex ?? 0]}
              alt={currentAnnouncement.title}
              className="max-w-[95vw] max-h-[90vh] object-contain cursor-zoom-out"
              onClick={(e) => {
                e.stopPropagation();
                setIsImageViewerOpen(false);
              }}
            />
            {imageUrls.length > 1 && lightboxIndex !== null && (
              <>
                <button
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex((lightboxIndex - 1 + imageUrls.length) % imageUrls.length);
                  }}
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
                <button
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex((lightboxIndex + 1) % imageUrls.length);
                  }}
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
