/**
 * Mobile Layout Overflow Prevention
 * 
 * This utility prevents common horizontal overflow issues on mobile devices
 * by applying CSS constraints and monitoring layout shifts
 */

/**
 * Initialize mobile layout fixes
 * Call this in your main app component or in a useEffect
 */
export function initializeMobileLayoutFixes() {
  // Prevent horizontal overflow on html and body
  const htmlStyle = document.documentElement.style;
  htmlStyle.overflow = 'hidden';
  htmlStyle.overflowX = 'hidden';
  htmlStyle.maxWidth = '100vw';
  htmlStyle.overflowWrap = 'break-word';
  htmlStyle.wordWrap = 'break-word';

  const bodyStyle = document.body.style;
  bodyStyle.overflow = 'hidden';
  bodyStyle.overflowX = 'hidden';
  bodyStyle.maxWidth = '100vw';
  bodyStyle.overflowWrap = 'break-word';
  bodyStyle.wordWrap = 'break-word';

  // Fix common overflow-causing elements
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    /* Prevent horizontal overflow on all elements */
    * {
      max-width: 100%;
      box-sizing: border-box;
    }

    /* Fix common overflow issues */
    table {
      width: 100% !important;
      table-layout: auto;
      overflow-x: auto;
      display: block;
      -webkit-overflow-scrolling: touch;
    }

    /* Tables in containers */
    .table-responsive {
      width: 100% !important;
      max-width: 100vw !important;
      overflow-x: auto !important;
      -webkit-overflow-scrolling: touch !important;
    }

    /* Fix grid overflow */
    .grid, [class*="grid-cols"] {
      width: 100% !important;
      max-width: 100% !important;
      overflow-x: hidden !important;
    }

    /* Fix flex containers */
    .flex, [class*="flex"] {
      width: 100% !important;
      max-width: 100% !important;
      overflow-x: hidden !important;
    }

    /* Fix container overflow */
    .container {
      width: 100% !important;
      max-width: 100% !important;
      padding-left: 1rem !important;
      padding-right: 1rem !important;
      overflow-x: hidden !important;
    }

    /* Fix form overflow */
    form {
      width: 100% !important;
      max-width: 100% !important;
      overflow-x: hidden !important;
    }

    form > * {
      max-width: 100% !important;
    }

    /* Fix input overflow */
    input, textarea, select {
      width: 100% !important;
      max-width: 100% !important;
    }

    /* Prevent button overflow */
    button {
      max-width: 100% !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }

    /* Prevent image overflow */
    img {
      max-width: 100% !important;
      height: auto !important;
      display: block !important;
    }

    /* Prevent video overflow */
    video, iframe {
      max-width: 100% !important;
      height: auto !important;
    }

    /* Fix list overflow */
    ul, ol, dl {
      width: 100% !important;
      max-width: 100% !important;
      overflow-x: hidden !important;
      padding-left: 1.5rem !important;
    }

    /* Prevent horizontal scroll on mobile */
    @media (max-width: 768px) {
      body {
        overflow-x: hidden !important;
        width: 100vw !important;
        max-width: 100vw !important;
      }

      html {
        overflow-x: hidden !important;
        width: 100vw !important;
        max-width: 100vw !important;
      }

      /* Ensure all containers respect viewport width */
      .container-fluid, .container {
        width: 100vw !important;
        max-width: 100vw !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
        padding-left: 1rem !important;
        padding-right: 1rem !important;
      }
    }
  `;

  document.head.appendChild(styleSheet);

  // Monitor for overflow-causing elements and fix them
  const observer = new MutationObserver(() => {
    checkAndFixOverflow();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class']
  });

  // Initial check
  checkAndFixOverflow();

  return () => observer.disconnect();
}

/**
 * Check for and fix elements causing horizontal overflow
 */
function checkAndFixOverflow() {
  // Check if horizontal scroll is present
  const hasHorizontalScroll = document.body.scrollWidth > window.innerWidth;
  
  if (hasHorizontalScroll) {
    console.warn('[Mobile Fix] Horizontal overflow detected, fixing...');
    fixOverflowingElements();
  }
}

/**
 * Fix elements that are causing horizontal overflow
 */
function fixOverflowingElements() {
  const elements = document.querySelectorAll('*');

  elements.forEach(element => {
    const rect = element.getBoundingClientRect();
    
    // If element extends beyond viewport width
    if (rect.right > window.innerWidth && element.scrollWidth > window.innerWidth) {
      const el = element as HTMLElement;
      
      // Apply fixes
      el.style.maxWidth = '100%';
      el.style.overflowX = 'auto';
      el.style.overflowY = 'visible';
      (el.style as any).WebkitOverflowScrolling = 'touch';
      
      // For tables specifically
      if (element.tagName === 'TABLE') {
        el.style.display = 'block';
        el.style.whiteSpace = 'nowrap';
      }
      
      // For forms and divs
      if (element.tagName === 'FORM' || element.tagName === 'DIV') {
        el.style.overflowX = 'hidden';
      }
    }
  });
}

/**
 * Disable horizontal scrolling while allowing vertical
 * Useful for preventing accidental horizontal scroll on mobile
 */
export function disableHorizontalScroll() {
  const preventDefault = (e: WheelEvent) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault();
    }
  };

  const preventTouchScroll = (e: TouchEvent) => {
    if (e.touches.length > 1) return; // Allow multi-touch

    const scrollLeft = window.scrollX || window.pageXOffset;
    const scrollableWidth = document.body.scrollWidth - window.innerWidth;

    if (scrollLeft === 0 || scrollLeft === scrollableWidth) {
      // At the edge, prevent scrolling in that direction
      e.preventDefault();
    }
  };

  document.addEventListener('wheel', preventDefault, { passive: false });
  document.addEventListener('touchmove', preventTouchScroll, { passive: false });

  return () => {
    document.removeEventListener('wheel', preventDefault);
    document.removeEventListener('touchmove', preventTouchScroll);
  };
}

/**
 * Enable smooth scrolling on mobile (momentum scrolling)
 */
export function enableSmoothScroll() {
  const style = document.createElement('style');
  style.textContent = `
    * {
      -webkit-overflow-scrolling: touch;
      scroll-behavior: smooth;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Fix common Bootstrap overflow issues
 */
export function fixBootstrapOverflow() {
  const style = document.createElement('style');
  style.textContent = `
    .container,
    .container-lg,
    .container-md,
    .container-sm,
    .container-xl,
    .container-xxl,
    .container-fluid {
      max-width: 100% !important;
      overflow-x: hidden !important;
    }

    .row {
      width: 100% !important;
      max-width: 100% !important;
      overflow-x: hidden !important;
    }

    .row > * {
      max-width: 100% !important;
    }

    /* Fix Bootstrap grid */
    [class*="col-"] {
      max-width: 100% !important;
      box-sizing: border-box !important;
    }

    /* Fix Bootstrap utilities */
    .w-100 {
      max-width: 100% !important;
    }

    .w-auto {
      max-width: 100% !important;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Fix common Tailwind overflow issues
 */
export function fixTailwindOverflow() {
  const style = document.createElement('style');
  style.textContent = `
    [class*="max-w-"] {
      max-width: 100% !important;
    }

    [class*="w-screen"] {
      max-width: 100vw !important;
    }

    [class*="overflow-x-"] {
      overflow-x: auto !important;
      -webkit-overflow-scrolling: touch !important;
    }

    @media (max-width: 768px) {
      [class*="max-w-"] {
        max-width: 100% !important;
      }

      [class*="w-full"] {
        width: 100% !important;
        max-width: 100% !important;
      }
    }
  `;
  document.head.appendChild(style);
}

/**
 * React Hook to fix mobile layout issues
 */
export function useMobileLayoutFix() {
  React.useEffect(() => {
    // Initialize fixes on mount
    const cleanup = initializeMobileLayoutFixes();
    enableSmoothScroll();
    fixBootstrapOverflow();
    fixTailwindOverflow();

    // Check for overflow on resize
    const handleResize = () => {
      checkAndFixOverflow();
    };

    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      cleanup();
      window.removeEventListener('resize', handleResize);
    };
  }, []);
}

// Import React at the top for the hook
import React from 'react';
