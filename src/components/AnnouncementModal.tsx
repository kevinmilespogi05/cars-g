import React, { useState } from 'react';
import { X, Calendar, User, Clock, AlertCircle, Info, AlertTriangle, Star, Shield, Users, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { FocusTrap } from './FocusTrap';
import { useImageViewerStore } from '../store/imageViewerStore';

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

interface AnnouncementModalProps {
  announcement: Announcement | null;
  onClose: () => void;
}

export function AnnouncementModal({ announcement, onClose }: AnnouncementModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { isImageViewerOpen, setIsImageViewerOpen } = useImageViewerStore();

  // Reset image index when announcement changes
  React.useEffect(() => {
    setCurrentImageIndex(0);
  }, [announcement?.id]);

  // Keyboard navigation for images in the modal
  React.useEffect(() => {
    if (!announcement?.image_url) return;
    
    const urls = (announcement.image_url || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    
    if (urls.length <= 1) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentImageIndex((prev) => (prev - 1 + urls.length) % urls.length);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentImageIndex((prev) => (prev + 1) % urls.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [announcement?.image_url, currentImageIndex]);

  // Keyboard support for lightbox
  React.useEffect(() => {
    if (!isImageViewerOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsImageViewerOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImageViewerOpen]);

  if (!announcement) return null;

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'high':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'normal':
        return <Info className="w-5 h-5 text-blue-500" />;
      case 'low':
        return <Star className="w-5 h-5 text-green-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
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

  const getTargetAudienceIcon = (audience: string) => {
    switch (audience) {
      case 'admins':
        return <Shield className="w-4 h-4" />;
      case 'patrols':
        return <MapPin className="w-4 h-4" />;
      case 'users':
        return <Users className="w-4 h-4" />;
      case 'all':
        return <Users className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
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
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>
        
        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <FocusTrap>
            <div className="bg-white">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getPriorityIcon(announcement.priority)}
                    <h3 className="text-xl font-semibold text-gray-900">{announcement.title}</h3>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              {/* Content */}
              <div className="px-6 py-6">
                {/* Image / Images */}
                {announcement.image_url && (
                  <div className="mb-6">
                    {(() => {
                      const urls = (announcement.image_url || '')
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean);
                      
                      if (urls.length === 0) return null;
                      
                      return (
                        <div className="relative bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden">
                          {/* Image Counter */}
                          {urls.length > 1 && (
                            <div className="absolute top-3 right-3 z-10 bg-black bg-opacity-70 text-white text-sm px-3 py-1.5 rounded-full font-medium">
                              {currentImageIndex + 1} / {urls.length}
                            </div>
                          )}
                          
                          <img
                            src={urls[currentImageIndex]}
                            alt={`${announcement.title} - Image ${currentImageIndex + 1}`}
                            className="w-full max-h-[500px] object-contain rounded-lg cursor-zoom-in"
                            onClick={() => setIsImageViewerOpen(true)}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const container = target.parentElement;
                              if (container) {
                                container.innerHTML = '<div class="flex items-center justify-center h-48 text-gray-400 w-full"><div class="text-center"><svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg><p class="text-sm">Image unavailable</p></div></div>';
                              }
                            }}
                          />
                          
                          {/* Navigation Buttons */}
                          {urls.length > 1 && (
                            <>
                              <button
                                onClick={() => setCurrentImageIndex((prev) => (prev - 1 + urls.length) % urls.length)}
                                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 rounded-full p-3 shadow-xl transition-all"
                                aria-label="Previous image"
                              >
                                <ChevronLeft className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => setCurrentImageIndex((prev) => (prev + 1) % urls.length)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 rounded-full p-3 shadow-xl transition-all"
                                aria-label="Next image"
                              >
                                <ChevronRight className="w-5 h-5" />
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(announcement.priority)}`}>
                    {getPriorityIcon(announcement.priority)}
                    {announcement.priority}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getTargetAudienceColor(announcement.target_audience)}`}>
                    {getTargetAudienceIcon(announcement.target_audience)}
                    {announcement.target_audience}
                  </span>
                  {isExpiringSoon && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                      <Clock className="w-4 h-4" />
                      Expires Soon
                    </span>
                  )}
                  {isExpired && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200">
                      <Clock className="w-4 h-4" />
                      Expired
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="prose prose-sm max-w-none">
                  <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {announcement.content}
                  </div>
                </div>

                {/* Meta Information */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>Author: {announcement.author?.username || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Created: {new Date(announcement.created_at).toLocaleString()}</span>
                    </div>
                    {announcement.expires_at && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Expires: {new Date(announcement.expires_at).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 flex items-center justify-center">
                        <div className={`w-2 h-2 rounded-full ${announcement.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      </span>
                      <span>Status: {announcement.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </FocusTrap>
        </div>
      </div>

      {/* Lightbox for fullscreen image view */}
      {isImageViewerOpen && announcement.image_url && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 z-[99999] bg-black flex items-center justify-center p-4"
          onClick={() => setIsImageViewerOpen(false)}
          style={{ margin: 0, padding: '1rem' }}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            onClick={(e) => {
              e.stopPropagation();
              setIsImageViewerOpen(false);
            }}
            aria-label="Close fullscreen"
          >
            <X className="w-10 h-10" />
          </button>

          {(() => {
            const urls = (announcement.image_url || '')
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);

            return (
              <>
                {/* Image Counter */}
                {urls.length > 1 && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-black bg-opacity-70 text-white text-base px-4 py-2 rounded-full font-medium">
                    {currentImageIndex + 1} / {urls.length}
                  </div>
                )}

                <div className="relative w-full h-full flex items-center justify-center p-4">
                  <img
                    src={urls[currentImageIndex]}
                    alt={`${announcement.title} - Image ${currentImageIndex + 1}`}
                    className="max-w-[95vw] max-h-[90vh] object-contain cursor-default"
                    onClick={(e) => e.stopPropagation()}
                  />

                  {/* Navigation Buttons */}
                  {urls.length > 1 && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex((prev) => (prev - 1 + urls.length) % urls.length);
                        }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 rounded-full p-4 shadow-xl transition-all"
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="w-8 h-8" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex((prev) => (prev + 1) % urls.length);
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 rounded-full p-4 shadow-xl transition-all"
                        aria-label="Next image"
                      >
                        <ChevronRight className="w-8 h-8" />
                      </button>
                    </>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
