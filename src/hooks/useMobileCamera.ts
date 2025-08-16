import { useState, useCallback } from 'react';

interface UseMobileCameraReturn {
  isSupported: boolean;
  isMobile: boolean;
  hasCamera: boolean;
  requestCameraPermission: () => Promise<boolean>;
  checkCameraSupport: () => Promise<boolean>;
}

export function useMobileCamera(): UseMobileCameraReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);

  // Check if running on mobile device
  const checkMobile = useCallback(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const mobileKeywords = ['android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
    const isMobileDevice = mobileKeywords.some(keyword => userAgent.includes(keyword));
    
    // Also check for PWA mode
    const isPWA = window.matchMedia('(display-mode: standalone)').matches;
    const isInTWA = window.matchMedia('(display-mode: minimal-ui)').matches;
    
    setIsMobile(isMobileDevice || isPWA || isInTWA);
    return isMobileDevice || isPWA || isInTWA;
  }, []);

  // Check camera support
  const checkCameraSupport = useCallback(async () => {
    const hasMediaDevices = 'mediaDevices' in navigator;
    const hasGetUserMedia = 'getUserMedia' in navigator.mediaDevices;
    
    if (!hasMediaDevices || !hasGetUserMedia) {
      setIsSupported(false);
      setHasCamera(false);
      return false;
    }

    try {
      // Check if we can enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      setHasCamera(videoDevices.length > 0);
      setIsSupported(true);
      return true;
    } catch (error) {
      console.error('Error checking camera support:', error);
      setIsSupported(false);
      setHasCamera(false);
      return false;
    }
  }, []);

  // Request camera permission
  const requestCameraPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment' // Prefer back camera on mobile
        }
      });
      
      // Stop the stream immediately after getting permission
      stream.getTracks().forEach(track => track.stop());
      
      return true;
    } catch (error) {
      console.error('Camera permission denied:', error);
      return false;
    }
  }, [isSupported]);

  // Initialize on mount
  React.useEffect(() => {
    checkMobile();
    checkCameraSupport();
  }, [checkMobile, checkCameraSupport]);

  return {
    isSupported,
    isMobile,
    hasCamera,
    requestCameraPermission,
    checkCameraSupport
  };
}
