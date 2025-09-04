import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, AlertCircle, Info, AlertTriangle, CheckCircle } from 'lucide-react';
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

  if (loading) {
    return null;
  }

  if (!isVisible || announcements.length === 0) {
    return null;
  }

  const currentAnnouncement = announcements[currentIndex];

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm mb-4 ${className}`}>
      <div className="relative">
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
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {getPriorityIcon(currentAnnouncement.priority)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-gray-900 text-sm">
                  {currentAnnouncement.title}
                </h3>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(currentAnnouncement.priority)}`}>
                  {currentAnnouncement.priority}
                </span>
              </div>
              
              {/* Image display */}
              {currentAnnouncement.image_url && (
                <div className="mb-3">
                  <img
                    src={currentAnnouncement.image_url}
                    alt={currentAnnouncement.title}
                    className="w-full h-32 object-cover rounded-lg border border-gray-200"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
              )}
              
              <p className="text-gray-700 text-sm leading-relaxed">
                {currentAnnouncement.content}
              </p>
              <div className="flex items-center justify-between mt-3">
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
      </div>
    </div>
  );
}
