import { useEffect, useState, useCallback } from 'react';

interface MobileOptimizationState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
  hasNotch: boolean;
  isStandalone: boolean;
  isOnline: boolean;
  devicePixelRatio: number;
  safeAreaInsets: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  supportsHover: boolean;
  supportsTouch: boolean;
}

/**
 * useM obileOptimization Hook
 * 
 * Comprehensive mobile device detection and optimization utilities
 * for Cars-G PWA to ensure perfect mobile experience
 * 
 * @returns Mobile optimization state and utilities
 */
export function useMobileOptimization(): MobileOptimizationState {
  const [state, setState] = useState<MobileOptimizationState>(() => {
    return getInitialState();
  });

  useEffect(() => {
    // Update on resize
    const handleResize = () => {
      setState(getInitialState());
    };

    // Update on online/offline
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('online', handleOnline, { passive: true });
    window.addEventListener('offline', handleOffline, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return state;
}

function getInitialState(): MobileOptimizationState {
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const devicePixelRatio = window.devicePixelRatio || 1;

  // Device detection
  const isMobile = screenWidth < 768;
  const isTablet = screenWidth >= 768 && screenWidth < 1024;
  const isDesktop = screenWidth >= 1024;

  // Check for notch (iPhone X, etc.)
  const hasNotch = CSS.supports('padding-top: max(0px, env(safe-area-inset-top))');

  // Check PWA mode
  const isStandalone = 
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    window.matchMedia('(display-mode: fullscreen)').matches;

  // Network status
  const isOnline = navigator.onLine;

  // Touch and hover support
  const supportsTouch = 
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0;

  const supportsHover = window.matchMedia('(hover: hover)').matches;

  // Safe area insets (for notched devices)
  const getSafeAreaValue = (side: 'top' | 'right' | 'bottom' | 'left'): number => {
    try {
      const value = getComputedStyle(document.documentElement).getPropertyValue(
        `env(safe-area-inset-${side})`
      );
      return parseInt(value) || 0;
    } catch {
      return 0;
    }
  };

  return {
    isMobile,
    isTablet,
    isDesktop,
    screenWidth,
    screenHeight,
    hasNotch,
    isStandalone,
    isOnline,
    devicePixelRatio,
    safeAreaInsets: {
      top: getSafeAreaValue('top'),
      right: getSafeAreaValue('right'),
      bottom: getSafeAreaValue('bottom'),
      left: getSafeAreaValue('left'),
    },
    supportsHover,
    supportsTouch,
  };
}

/**
 * Hook to apply safe area padding
 */
export function useSafeAreaPadding() {
  const { safeAreaInsets } = useMobileOptimization();

  return {
    paddingTop: `calc(1rem + ${safeAreaInsets.top}px)`,
    paddingRight: `calc(1rem + ${safeAreaInsets.right}px)`,
    paddingBottom: `calc(1rem + ${safeAreaInsets.bottom}px)`,
    paddingLeft: `calc(1rem + ${safeAreaInsets.left}px)`,
  };
}

/**
 * Hook to detect if viewport meta needs adjustment
 */
export function useViewportAdjustment() {
  useEffect(() => {
    // Prevent zoom on input focus (iOS)
    const handleInputFocus = () => {
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        // Allow zoom for accessibility while preventing unintended zoom
        viewport.setAttribute('content', 
          'width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover'
        );
      }
    };

    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
      input.addEventListener('focus', handleInputFocus, { passive: true });
    });

    return () => {
      inputs.forEach(input => {
        input.removeEventListener('focus', handleInputFocus);
      });
    };
  }, []);
}

/**
 * Hook to manage 100vh properly on mobile (accounts for address bar)
 */
export function useMobileViewportHeight() {
  useEffect(() => {
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setVh();
    window.addEventListener('resize', setVh, { passive: true });
    window.addEventListener('orientationchange', setVh, { passive: true });

    return () => {
      window.removeEventListener('resize', setVh);
      window.removeEventListener('orientationchange', setVh);
    };
  }, []);
}

/**
 * Hook to detect if keyboard is visible (approximate)
 */
export function useKeyboardVisible() {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      // Rough estimate: if viewport height decreased significantly, keyboard is likely open
      const windowHeight = window.innerHeight;
      const screenHeight = window.screen.availHeight;
      
      setIsKeyboardVisible(windowHeight < screenHeight * 0.75);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isKeyboardVisible;
}
