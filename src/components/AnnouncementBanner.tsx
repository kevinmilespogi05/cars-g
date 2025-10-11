import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Info, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

interface Announcement {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  target_audience: 'all' | 'users' | 'patrols' | 'admins';
  created_at: string;
  expires_at?: string;
}

interface AnnouncementBannerProps {
  className?: string;
}

export function AnnouncementBanner({ className = '' }: AnnouncementBannerProps) {
  const { user } = useAuthStore();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching announcements:', error);
        return;
      }

      if (data) {
        // Filter announcements based on user role
        const filteredData = data.filter((announcement) => {
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
        });

        setAnnouncements(filteredData);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [user]);

  // Reset image index when switching announcements or expanding/collapsing
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [currentIndex, isExpanded]);

  // Get current announcement and image URLs (safe to use before early returns)
  const currentAnnouncement = announcements[currentIndex];
  const imageUrls = React.useMemo(
    () => {
      if (!currentAnnouncement?.image_url) return [];
      return currentAnnouncement.image_url
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    },
    [currentAnnouncement?.image_url]
  );

  // Keyboard support for lightbox
  useEffect(() => {
    if (!isLightboxOpen || imageUrls.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentImageIndex((prev) => (prev - 1 + imageUrls.length) % imageUrls.length);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentImageIndex((prev) => (prev + 1) % imageUrls.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, currentImageIndex, imageUrls.length]);

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'high':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case 'normal':
        return <Info className="h-5 w-5 text-blue-500" />;
      case 'low':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
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

  const handleDismiss = () => {
    setIsVisible(false);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % announcements.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length);
  };

  if (loading) {
    return null;
  }

  if (!isVisible || announcements.length === 0 || !currentAnnouncement) {
    return null;
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {getPriorityIcon(currentAnnouncement.priority)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-gray-900 text-sm">
                  {currentAnnouncement.title}
                </h3>
                <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getPriorityColor(currentAnnouncement.priority)}`}>
                  {currentAnnouncement.priority}
                </span>
              </div>
              
              {isExpanded ? (
                <div className="text-sm text-gray-600 leading-relaxed">
                  <p className="mb-3">{currentAnnouncement.content}</p>
                  {imageUrls.length > 0 && (
                    <div className="mt-3 relative">
                      {/* Image Counter */}
                      {imageUrls.length > 1 && (
                        <div className="absolute top-2 right-2 z-10 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full font-medium">
                          {currentImageIndex + 1} / {imageUrls.length}
                        </div>
                      )}
                      
                      <div className="relative bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden">
                        <img 
                          src={imageUrls[currentImageIndex]} 
                          alt={`${currentAnnouncement.title} - Image ${currentImageIndex + 1}`}
                          className="w-full max-h-96 object-contain rounded-lg cursor-zoom-in"
                          onClick={() => setIsLightboxOpen(true)}
                        />
                        
                        {/* Navigation Buttons */}
                        {imageUrls.length > 1 && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentImageIndex((prev) => (prev - 1 + imageUrls.length) % imageUrls.length);
                              }}
                              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 rounded-full p-2 shadow-lg transition-all"
                              aria-label="Previous image"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentImageIndex((prev) => (prev + 1) % imageUrls.length);
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 rounded-full p-2 shadow-lg transition-all"
                              aria-label="Next image"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-600 line-clamp-2">
                  {currentAnnouncement.content}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            {announcements.length > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrev}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Previous announcement"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <span className="text-xs text-gray-500">
                  {currentIndex + 1} / {announcements.length}
                </span>
                <button
                  onClick={handleNext}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Next announcement"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            )}
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            
            <button
              onClick={handleDismiss}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Dismiss announcement"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox for fullscreen image view */}
      {isLightboxOpen && imageUrls.length > 0 && (
        <div
          className="fixed inset-0 z-[9999] bg-black bg-opacity-95 flex items-center justify-center p-4"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            onClick={(e) => {
              e.stopPropagation();
              setIsLightboxOpen(false);
            }}
            aria-label="Close fullscreen"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Image Counter */}
          {imageUrls.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-black bg-opacity-70 text-white text-sm px-4 py-2 rounded-full font-medium">
              {currentImageIndex + 1} / {imageUrls.length}
            </div>
          )}

          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={imageUrls[currentImageIndex]}
              alt={`${currentAnnouncement.title} - Image ${currentImageIndex + 1}`}
              className="max-w-[95vw] max-h-[95vh] object-contain cursor-default"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Navigation Buttons */}
            {imageUrls.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex((prev) => (prev - 1 + imageUrls.length) % imageUrls.length);
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 rounded-full p-3 shadow-xl transition-all"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex((prev) => (prev + 1) % imageUrls.length);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 rounded-full p-3 shadow-xl transition-all"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
