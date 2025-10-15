import React, { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useImageViewerStore } from '../store/imageViewerStore';

interface ImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  alt?: string;
  images?: string[];
  currentIndex?: number;
  onPrevious?: () => void;
  onNext?: () => void;
  showNavigation?: boolean;
}

export function ImageViewer({
  isOpen,
  onClose,
  imageUrl,
  alt = 'Image',
  images = [],
  currentIndex = 0,
  onPrevious,
  onNext,
  showNavigation = false
}: ImageViewerProps) {
  const { setIsImageViewerOpen } = useImageViewerStore();

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Set global state
      setIsImageViewerOpen(true);
      
      // Store the current scroll position
      const scrollY = window.scrollY;
      
      // Add styles to prevent scrolling
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Clear global state
        setIsImageViewerOpen(false);
        
        // Restore scroll position
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen, setIsImageViewerOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && onPrevious) {
        onPrevious();
      } else if (e.key === 'ArrowRight' && onNext) {
        onNext();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onPrevious, onNext]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[99999] bg-black bg-opacity-95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop - click to close */}
      <div className="absolute inset-0" onClick={onClose} />
      
      {/* Image Container */}
      <div 
        className="relative max-w-[95vw] max-h-[95vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors z-10 bg-black bg-opacity-50 rounded-full p-2"
          aria-label="Close image viewer"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Navigation Arrows */}
        {showNavigation && images.length > 1 && (
          <>
            {currentIndex > 0 && onPrevious && (
              <button
                onClick={onPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10 bg-black bg-opacity-50 rounded-full p-2"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            
            {currentIndex < images.length - 1 && onNext && (
              <button
                onClick={onNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10 bg-black bg-opacity-50 rounded-full p-2"
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </>
        )}

        {/* Image Counter */}
        {showNavigation && images.length > 1 && (
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 rounded-full px-3 py-1">
            {currentIndex + 1} / {images.length}
          </div>
        )}

        {/* Image */}
        <img
          src={imageUrl}
          alt={alt}
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          loading="eager"
          decoding="sync"
          fetchPriority="high"
          onError={(e) => {
            console.error('Failed to load image:', imageUrl);
            const imgElement = e.target as HTMLImageElement;
            imgElement.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD48L3N2Zz4=';
          }}
        />
      </div>
    </div>
  );
}
