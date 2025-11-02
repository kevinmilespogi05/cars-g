import { useState, useEffect } from 'react';

/**
 * useReducedMotion Hook
 * 
 * Detects if the user has requested reduced motion via their system preferences.
 * This helps make the app more accessible for users with motion sensitivity.
 * 
 * @returns boolean - true if user prefers reduced motion
 * 
 * @example
 * const shouldReduceMotion = useReducedMotion();
 * 
 * <motion.div
 *   animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
 *   transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3 }}
 * />
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    // Check on initial render
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      return mediaQuery.matches;
    }
    return false;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Add listener for changes
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
}

