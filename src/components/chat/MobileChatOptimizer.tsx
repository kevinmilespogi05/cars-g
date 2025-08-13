import React, { useEffect, useState } from 'react';
import { Smartphone, Monitor, Tablet } from 'lucide-react';

interface MobileChatOptimizerProps {
  children: React.ReactNode;
}

export const MobileChatOptimizer: React.FC<MobileChatOptimizerProps> = ({ children }) => {
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [isLandscape, setIsLandscape] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Determine device type
      if (width < 768) {
        setDeviceType('mobile');
      } else if (width < 1024) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
      
      // Check orientation
      setIsLandscape(width > height);
      setViewportHeight(height);
    };

    // Initial check
    updateDeviceInfo();
    
    // Listen for resize and orientation changes
    window.addEventListener('resize', updateDeviceInfo);
    window.addEventListener('orientationchange', updateDeviceInfo);
    
    // Set viewport height for mobile browsers
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
      window.removeEventListener('resize', setVH);
      window.removeEventListener('orientationchange', setVH);
    };
  }, []);

  // Add mobile-specific classes to body
  useEffect(() => {
    const body = document.body;
    
    // Remove existing device classes
    body.classList.remove('device-mobile', 'device-tablet', 'device-desktop');
    body.classList.remove('orientation-landscape', 'orientation-portrait');
    
    // Add current device class
    body.classList.add(`device-${deviceType}`);
    body.classList.add(`orientation-${isLandscape ? 'landscape' : 'portrait'}`);
    
    // Add mobile-specific optimizations
    if (deviceType === 'mobile') {
      body.classList.add('mobile-optimized');
      
      // Prevent zoom on input focus (iOS)
      const inputs = document.querySelectorAll('input, textarea, select');
      inputs.forEach(input => {
        input.addEventListener('focus', () => {
          input.style.fontSize = '16px';
        });
      });
    }
  }, [deviceType, isLandscape]);

  // Device indicator (for development/debugging)
  const DeviceIndicator = () => {
    if (process.env.NODE_ENV === 'development') {
      return (
        <div className="fixed top-0 right-0 z-50 bg-gray-800 text-white px-2 py-1 text-xs rounded-bl-lg">
          <div className="flex items-center space-x-1">
            {deviceType === 'mobile' && <Smartphone className="w-3 h-3" />}
            {deviceType === 'tablet' && <Tablet className="w-3 h-3" />}
            {deviceType === 'desktop' && <Monitor className="w-3 h-3" />}
            <span className="capitalize">{deviceType}</span>
            {isLandscape && <span>L</span>}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <DeviceIndicator />
      <div 
        className={`mobile-chat-optimizer device-${deviceType} ${isLandscape ? 'landscape' : 'portrait'}`}
        style={{
          '--vh': `${viewportHeight * 0.01}px`,
        } as React.CSSProperties}
      >
        {children}
      </div>
    </>
  );
};

// Hook for using device information in components
export const useDeviceInfo = () => {
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      if (width < 768) {
        setDeviceType('mobile');
      } else if (width < 1024) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
      
      setIsLandscape(width > height);
    };

    updateDeviceInfo();
    window.addEventListener('resize', updateDeviceInfo);
    window.addEventListener('orientationchange', updateDeviceInfo);

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
    };
  }, []);

  return { deviceType, isLandscape, isMobile: deviceType === 'mobile' };
};

// Utility component for responsive content
export const ResponsiveContent: React.FC<{
  mobile?: React.ReactNode;
  tablet?: React.ReactNode;
  desktop?: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ mobile, tablet, desktop, fallback }) => {
  const { deviceType } = useDeviceInfo();
  
  switch (deviceType) {
    case 'mobile':
      return <>{mobile || fallback}</>;
    case 'tablet':
      return <>{tablet || fallback}</>;
    case 'desktop':
      return <>{desktop || fallback}</>;
    default:
      return <>{fallback}</>;
  }
};

// Mobile-specific chat utilities
export const MobileChatUtils = {
  // Prevent body scroll when mobile keyboard is open
  preventBodyScroll: () => {
    if (typeof window !== 'undefined') {
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${window.scrollY}px`;
    }
  },
  
  // Restore body scroll
  restoreBodyScroll: () => {
    if (typeof window !== 'undefined') {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
  },
  
  // Get safe area insets
  getSafeAreaInsets: () => {
    if (typeof window !== 'undefined' && 'CSS' in window && CSS.supports('padding-top: env(safe-area-inset-top)')) {
      return {
        top: getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0px',
        bottom: getComputedStyle(document.documentElement).getPropertyValue('--sab') || '0px',
        left: getComputedStyle(document.documentElement).getPropertyValue('--sal') || '0px',
        right: getComputedStyle(document.documentElement).getPropertyValue('--sar') || '0px',
      };
    }
    return { top: '0px', bottom: '0px', left: '0px', right: '0px' };
  },
  
  // Check if device supports touch
  isTouchDevice: () => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  },
  
  // Get device pixel ratio
  getDevicePixelRatio: () => {
    return window.devicePixelRatio || 1;
  },
}; 