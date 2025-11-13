import React, { useEffect, useRef, useState } from 'react';
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
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const translate = useRef({ x: 0, y: 0 });
  const lastTouchDistance = useRef<number | null>(null);
  const lastPan = useRef<{ x: number; y: number } | null>(null);
  const lastTap = useRef<number>(0);
  const isMouseDown = useRef(false);
  const mouseStart = useRef({ x: 0, y: 0 });

  const MIN_SCALE = 1;
  const MAX_SCALE = 4;

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

  // Touch handlers for swipe navigation
  // Basic swipe and pinch/pan handlers
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartX.current = e.touches[0]?.clientX ?? null;
      lastPan.current = { x: e.touches[0].clientX - translate.current.x, y: e.touches[0].clientY - translate.current.y };
    } else if (e.touches.length === 2) {
      // Start pinch
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDistance.current = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistance.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const factor = dist / lastTouchDistance.current;
      let nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * factor));
      setScale(nextScale);
      // Update base distance for relative changes
      lastTouchDistance.current = dist;
    } else if (e.touches.length === 1 && scale > 1 && lastPan.current) {
      // Pan while zoomed
      const x = e.touches[0].clientX - lastPan.current.x;
      const y = e.touches[0].clientY - lastPan.current.y;
      translate.current = { x, y };
      applyTransform();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    // If it was a single-finger tap/drag
    if (e.changedTouches && e.changedTouches.length === 1 && Math.abs((e.changedTouches[0]?.clientX ?? 0) - (touchStartX.current ?? 0)) > 50) {
      const diff = (e.changedTouches[0]?.clientX ?? 0) - (touchStartX.current ?? 0);
      const threshold = 50; // pixels
      if (diff > threshold && onPrevious) {
        onPrevious();
      } else if (diff < -threshold && onNext) {
        onNext();
      }
    }
    touchStartX.current = null;
    lastTouchDistance.current = null;
    lastPan.current = null;
  };

  const applyTransform = () => {
    if (!imgRef.current) return;
    const t = translate.current;
    imgRef.current.style.transform = `translate(${t.x}px, ${t.y}px) scale(${scale})`;
  };

  // Wheel zoom for desktop and vertical panning
  const handleWheel = (e: React.WheelEvent) => {
    // Ctrl+scroll = zoom
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = -e.deltaY;
      const zoomFactor = delta > 0 ? 1.1 : 0.9;
      const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * zoomFactor));
      setScale(nextScale);
    } else if (scale > 1) {
      // Regular scroll when zoomed = pan vertically
      e.preventDefault();
      const panAmount = e.deltaY * 0.8; // Adjust sensitivity
      translate.current.y -= panAmount;
      applyTransform();
    }
  };

  // Double-tap to toggle zoom
  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      // Toggle
      const next = scale > 1 ? 1 : 2;
      setScale(next);
    }
    lastTap.current = now;
  };

  // Mouse drag handlers for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    isMouseDown.current = true;
    mouseStart.current = { x: e.clientX - translate.current.x, y: e.clientY - translate.current.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown.current || scale <= 1) return;
    translate.current.x = e.clientX - mouseStart.current.x;
    translate.current.y = e.clientY - mouseStart.current.y;
    applyTransform();
  };

  const handleMouseUp = () => {
    isMouseDown.current = false;
  };

  useEffect(() => {
    applyTransform();
  }, [scale]);

  return (
    <div 
      className="fixed inset-0 z-[99999] bg-black bg-opacity-95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop - click to close */}
      <div className="absolute inset-0" onClick={onClose} />
      
      {/* Image Container */}
      <div 
        ref={wrapperRef}
        className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center p-8"
        onClick={(e) => e.stopPropagation()}
  onTouchStart={(e) => { handleTouchStart(e); handleDoubleTap(); }}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
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
          ref={imgRef}
          src={imageUrl}
          alt={alt}
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl cursor-grab active:cursor-grabbing"
          style={{ transform: `scale(${scale})` }}
          loading="eager"
          decoding="sync"
          fetchPriority="high"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
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
