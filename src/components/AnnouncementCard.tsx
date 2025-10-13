import React, { useState } from 'react';
import { Calendar, User, Eye, Clock, AlertCircle, Info, AlertTriangle, Star, ChevronLeft, ChevronRight, X } from 'lucide-react';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  author_id: string;
  author?: {
    username: string;
    avatar_url?: string;
  };
  is_active: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  target_audience: 'all' | 'users' | 'patrols' | 'admins';
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

interface AnnouncementCardProps {
  announcement: Announcement;
  onView: (announcement: Announcement) => void;
  showAuthor?: boolean;
}

export function AnnouncementCard({ announcement, onView, showAuthor = true }: AnnouncementCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const imageUrls = (announcement.image_url || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Keyboard support for lightbox
  React.useEffect(() => {
    if (!isLightboxOpen) return;

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
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'normal':
        return <Info className="w-4 h-4 text-blue-500" />;
      case 'low':
        return <Star className="w-4 h-4 text-green-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'normal':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTargetAudienceColor = (audience: string) => {
    switch (audience) {
      case 'admins':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'patrols':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'users':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'all':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isExpired = announcement.expires_at && new Date(announcement.expires_at) < new Date();
  const isExpiringSoon = announcement.expires_at && 
    new Date(announcement.expires_at) < new Date(Date.now() + 24 * 60 * 60 * 1000) && 
    new Date(announcement.expires_at) > new Date();

  return (
    <div 
      className={`bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group ${
        isExpired ? 'opacity-60' : ''
      }`}
      onClick={() => onView(announcement)}
    >
      {/* Image */}
      {imageUrls.length > 0 && (
        <div className="relative min-h-48 max-h-64 overflow-hidden rounded-t-lg bg-gray-50 flex items-center justify-center">
          {/* Image Counter */}
          {imageUrls.length > 1 && (
            <div className="absolute top-2 right-2 z-10 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-full">
              {currentImageIndex + 1} / {imageUrls.length}
            </div>
          )}
          
          <img
            src={imageUrls[currentImageIndex]}
            alt={`${announcement.title} - Image ${currentImageIndex + 1}`}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200 cursor-zoom-in"
            onClick={(e) => {
              e.stopPropagation();
              setIsLightboxOpen(true);
            }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const container = target.parentElement;
              if (container) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'flex items-center justify-center h-48 text-gray-400';
                errorDiv.innerHTML = '<div class="text-center"><svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg><p class="text-sm">Image unavailable</p></div>';
                container.appendChild(errorDiv);
              }
            }}
          />
          
          {/* Navigation Buttons */}
          {imageUrls.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex((prev) => (prev - 1 + imageUrls.length) % imageUrls.length);
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white bg-opacity-80 hover:bg-opacity-100 text-gray-800 rounded-full p-2 shadow-lg transition-all"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex((prev) => (prev + 1) % imageUrls.length);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white bg-opacity-80 hover:bg-opacity-100 text-gray-800 rounded-full p-2 shadow-lg transition-all"
                aria-label="Next image"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
          
          {isExpired && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <span className="text-white font-semibold">Expired</span>
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {isLightboxOpen && imageUrls.length > 0 && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 z-[99999] bg-black flex items-center justify-center p-4"
          onClick={(e) => {
            e.stopPropagation();
            setIsLightboxOpen(false);
          }}
          style={{ margin: 0, padding: '1rem' }}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            onClick={(e) => {
              e.stopPropagation();
              setIsLightboxOpen(false);
            }}
            aria-label="Close lightbox"
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
              alt={`${announcement.title} - Image ${currentImageIndex + 1}`}
              className="max-w-full max-h-full object-contain cursor-default"
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

      {/* Content */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
              {announcement.title}
            </h3>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onView(announcement);
            }}
            className="ml-2 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="View full announcement"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>

        {/* Description */}
        <p className="text-gray-600 text-sm line-clamp-3 mb-4">
          {announcement.content}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(announcement.priority)}`}>
            {getPriorityIcon(announcement.priority)}
            {announcement.priority}
          </span>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getTargetAudienceColor(announcement.target_audience)}`}>
            {announcement.target_audience}
          </span>
          {isExpiringSoon && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
              <Clock className="w-3 h-3" />
              Expires Soon
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            {showAuthor && announcement.author && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{announcement.author.username}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{new Date(announcement.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-blue-600">
            <Eye className="w-3 h-3" />
            <span>View</span>
          </div>
        </div>
      </div>
    </div>
  );
}
