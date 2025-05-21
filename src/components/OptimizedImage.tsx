import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
}

export const OptimizedImage = ({
  src,
  alt,
  className = '',
  width,
  height,
  priority = false,
  objectFit = 'cover'
}: OptimizedImageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    const loadImage = async () => {
      try {
        // Reset states when src changes
        setIsLoading(true);
        setError(null);

        // Create a new image object
        const img = new Image();
        
        // Try WebP first
        const webpSrc = src.replace(/\.(jpg|jpeg|png)$/, '.webp');
        
        // Check if WebP is supported and the WebP version exists
        const supportsWebP = await checkWebPSupport();
        
        if (supportsWebP) {
          try {
            await checkImageExists(webpSrc);
            setImageSrc(webpSrc);
          } catch {
            // If WebP doesn't exist, fall back to original
            setImageSrc(src);
          }
        } else {
          setImageSrc(src);
        }

        // Load the actual image
        img.src = imageSrc || src;
        
        img.onload = () => {
          setIsLoading(false);
        };

        img.onerror = () => {
          setError('Failed to load image');
          setIsLoading(false);
        };

      } catch (err) {
        setError('Failed to load image');
        setIsLoading(false);
      }
    };

    loadImage();
  }, [src]);

  return (
    <div
      className={`relative ${className}`}
      style={{ width: width ? `${width}px` : '100%', height: height ? `${height}px` : '100%' }}
    >
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg"
          />
        )}
      </AnimatePresence>

      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-lg">
          <span className="text-gray-500 dark:text-gray-400 text-sm">Failed to load image</span>
        </div>
      ) : (
        <motion.img
          src={imageSrc || src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          className={`w-full h-full rounded-lg ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          style={{ objectFit }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoading ? 0 : 1 }}
          transition={{ duration: 0.3 }}
        />
      )}
    </div>
  );
};

// Helper function to check WebP support
const checkWebPSupport = async (): Promise<boolean> => {
  const elem = document.createElement('canvas');
  if (elem.getContext && elem.getContext('2d')) {
    return elem.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }
  return false;
};

// Helper function to check if an image exists
const checkImageExists = (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject();
    img.src = url;
  });
}; 