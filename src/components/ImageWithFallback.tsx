import React, { useState, ImgHTMLAttributes } from 'react';
import { ImageOff } from 'lucide-react';

interface ImageWithFallbackProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
  fallbackIcon?: boolean;
  className?: string;
}

/**
 * ImageWithFallback Component
 * 
 * A reusable image component that gracefully handles image loading errors
 * by displaying either a fallback image or a fallback icon placeholder.
 * 
 * @param src - Primary image source URL
 * @param alt - Alternative text for accessibility
 * @param fallback - Optional fallback image URL (defaults to placeholder icon)
 * @param fallbackIcon - Whether to show an icon placeholder on error (default: true)
 * @param className - Additional CSS classes
 */
export function ImageWithFallback({
  src,
  alt,
  fallback = '/images/placeholder.png',
  fallbackIcon = true,
  className = '',
  ...props
}: ImageWithFallbackProps) {
  const [error, setError] = useState(false);
  const [fallbackError, setFallbackError] = useState(false);

  const handleError = () => {
    if (!error) {
      setError(true);
    } else if (fallback && !fallbackError) {
      setFallbackError(true);
    }
  };

  // If both primary and fallback failed, show icon placeholder
  if ((error && fallbackError) || (error && !fallback)) {
    if (fallbackIcon) {
      return (
        <div
          className={`flex items-center justify-center bg-gray-100 ${className}`}
          role="img"
          aria-label={alt}
        >
          <ImageOff className="h-8 w-8 text-gray-600" aria-hidden="true" />
        </div>
      );
    }
    return null;
  }

  // Determine which source to use
  const currentSrc = error && !fallbackError ? fallback : src;

  return (
    <img
      {...props}
      src={currentSrc}
      alt={alt}
      className={className}
      onError={handleError}
      loading="lazy"
    />
  );
}

