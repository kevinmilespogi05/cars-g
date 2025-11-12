/**
 * Mobile Optimizations Initializer
 * 
 * This module initializes all mobile optimizations for the Cars-G PWA.
 * It should be called as early as possible in the application lifecycle.
 */

import { useEffect } from 'react';
import { initializeMobileLayoutFixes, enableSmoothScroll, fixBootstrapOverflow, fixTailwindOverflow } from '../lib/mobileLayoutFix';
import { useMobileOptimization, useMobileViewportHeight } from '../hooks/useMobileOptimization';
import { useMobileTouchTargets, useMobileInputBehavior, useMobileFormErrors } from '../hooks/useMobileFormFix';

/**
 * Initialize all mobile optimizations
 */
export function initializeMobileOptimizations() {
  // Initialize viewport height fix for 100vh
  if (typeof window !== 'undefined') {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    
    window.addEventListener('resize', () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    }, { passive: true });
  }

  // Initialize mobile layout fixes
  const cleanupLayoutFixes = initializeMobileLayoutFixes();
  enableSmoothScroll();
  fixBootstrapOverflow();
  fixTailwindOverflow();

  // Return cleanup function
  return () => {
    cleanupLayoutFixes();
  };
}

/**
 * Component to initialize all mobile fixes
 * Place this at the root of your React app
 */
export function MobileOptimizationsProvider() {
  useMobileViewportHeight();
  useMobileTouchTargets();
  useMobileInputBehavior();
  useMobileFormErrors();
  const { isMobile, isOnline, devicePixelRatio } = useMobileOptimization();

  useEffect(() => {
    // Log device information for debugging
    console.log('[Mobile Optimization] Device Info:', {
      isMobile,
      isOnline,
      devicePixelRatio,
      userAgent: navigator.userAgent,
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      viewport: document.querySelector('meta[name="viewport"]')?.getAttribute('content'),
    });
  }, [isMobile, isOnline, devicePixelRatio]);

  // Apply mobile-specific CSS class to document
  useEffect(() => {
    if (isMobile) {
      document.documentElement.classList.add('is-mobile');
    } else {
      document.documentElement.classList.remove('is-mobile');
    }
  }, [isMobile]);

  return null;
}

/**
 * Hook to use mobile optimizations
 */
export function useMobileOptimizationsSetup() {
  useEffect(() => {
    initializeMobileOptimizations();
  }, []);
}

/**
 * Get mobile environment information
 */
export function getMobileEnvironmentInfo() {
  return {
    isMobile: window.innerWidth < 768,
    isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
    isDesktop: window.innerWidth >= 1024,
    isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    isOnline: navigator.onLine,
    isStandalone: window.matchMedia('(display-mode: standalone)').matches,
    isPWA: 'serviceWorker' in navigator,
    hasNotch: CSS.supports('padding-top: max(0px, env(safe-area-inset-top))'),
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio || 1,
    userAgent: navigator.userAgent,
  };
}

/**
 * Apply mobile-specific styles
 */
export function applyMobileStyles() {
  const style = document.createElement('style');
  style.id = 'mobile-optimizations';
  style.textContent = `
    /* Mobile Optimization Styles */
    
    /* Use dynamic viewport height */
    .mobile-full-height {
      height: 100vh;
      height: 100dvh;
      height: calc(var(--vh, 1vh) * 100);
    }

    /* Safe area support */
    .safe-area-top {
      padding-top: env(safe-area-inset-top);
    }

    .safe-area-bottom {
      padding-bottom: env(safe-area-inset-bottom);
    }

    .safe-area-left {
      padding-left: env(safe-area-inset-left);
    }

    .safe-area-right {
      padding-right: env(safe-area-inset-right);
    }

    /* Mobile device indicator */
    @media (max-width: 768px) {
      html.is-mobile {
        --is-mobile: true;
      }

      /* Mobile-specific typography */
      body {
        text-rendering: optimizeSpeed;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      /* Disable hover on touch devices */
      @media (hover: none) {
        button:hover,
        a:hover,
        [role="button"]:hover {
          transform: none;
          background-color: inherit;
        }
      }
    }

    /* Touch-friendly interaction */
    @supports (pointer: coarse) {
      button,
      a,
      [role="button"],
      input,
      select,
      textarea {
        min-height: 44px;
        min-width: 44px;
      }
    }

    /* Prevent zoom on input */
    input[type="text"],
    input[type="email"],
    input[type="password"],
    input[type="number"],
    input[type="tel"],
    input[type="url"],
    textarea,
    select {
      font-size: 16px;
    }

    /* Fix 100vh on mobile */
    @media (max-width: 768px) {
      .mobile-viewport {
        height: 100vh;
        height: 100dvh;
        height: calc(var(--vh, 1vh) * 100);
      }
    }
  `;

  document.head.appendChild(style);
  
  return () => {
    const element = document.getElementById('mobile-optimizations');
    if (element) {
      element.remove();
    }
  };
}

/**
 * Setup error logging for mobile-specific issues
 */
export function setupMobileErrorLogging() {
  window.addEventListener('error', (event) => {
    const envInfo = getMobileEnvironmentInfo();
    
    // Log mobile-specific errors with device context
    console.error('[Mobile Error]', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      deviceInfo: envInfo,
    });
  });

  // Log unhandled promise rejections on mobile
  window.addEventListener('unhandledrejection', (event) => {
    const envInfo = getMobileEnvironmentInfo();
    
    console.error('[Mobile Promise Rejection]', {
      reason: event.reason,
      deviceInfo: envInfo,
    });
  });
}
