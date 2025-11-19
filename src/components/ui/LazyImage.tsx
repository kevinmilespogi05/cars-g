import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholder?: string;
  fallback?: string;
  className?: string;
  containerClassName?: string;
  onError?: () => void;
  loading?: 'lazy' | 'eager';
  threshold?: number; // Intersection observer threshold
}

export function LazyImage({
  src,
  alt,
  placeholder,
  fallback,
  className,
  containerClassName,
  onError,
  loading = 'lazy',
  threshold = 0.1,
  ...props
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(placeholder || '');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(loading === 'eager');
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (loading === 'eager' || isInView) {
      loadImage();
    } else {
      // Set up intersection observer for lazy loading
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsInView(true);
              if (observerRef.current && imgRef.current) {
                observerRef.current.unobserve(imgRef.current);
              }
            }
          });
        },
        { threshold }
      );

      if (imgRef.current) {
        observerRef.current.observe(imgRef.current);
      }
    }

    return () => {
      if (observerRef.current && imgRef.current) {
        observerRef.current.unobserve(imgRef.current);
      }
    };
  }, [loading, isInView, threshold]);

  useEffect(() => {
    if (isInView) {
      loadImage();
    }
  }, [isInView, src]);

  const loadImage = () => {
    if (!src) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setHasError(false);

    const img = new Image();
    img.onload = () => {
      setImageSrc(src);
      setIsLoading(false);
    };
    img.onerror = () => {
      setHasError(true);
      setIsLoading(false);
      if (fallback) {
        setImageSrc(fallback);
      } else {
        setImageSrc(
          'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE2IiBmaWxsPSIjODg4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg=='
        );
      }
      onError?.();
    };
    img.src = src;
  };

  return (
    <div
      ref={imgRef}
      className={cn('relative overflow-hidden', containerClassName)}
      style={{ minHeight: props.height || '200px' }}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      )}
      <img
        src={imageSrc}
        alt={alt}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          hasError && 'opacity-50',
          className
        )}
        loading={loading}
        {...props}
      />
    </div>
  );
}

