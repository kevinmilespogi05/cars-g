import { useEffect, useRef } from 'react';

/**
 * Hook to handle keyboard navigation for modals, dropdowns, and focus traps
 */
export function useKeyboardNavigation(
  isOpen: boolean,
  onClose?: () => void,
  options?: {
    closeOnEscape?: boolean;
    trapFocus?: boolean;
    initialFocusRef?: React.RefObject<HTMLElement>;
    returnFocusRef?: React.RefObject<HTMLElement>;
  }
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const {
    closeOnEscape = true,
    trapFocus = true,
    initialFocusRef,
    returnFocusRef
  } = options || {};

  useEffect(() => {
    if (!isOpen) return;

    // Store the previously focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Focus initial element if provided
    if (initialFocusRef?.current) {
      initialFocusRef.current.focus();
    } else if (containerRef.current) {
      // Focus first focusable element in container
      const firstFocusable = containerRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape' && onClose) {
        onClose();
        return;
      }

      if (!trapFocus || !containerRef.current) return;

      // Tab key handling for focus trap
      if (e.key === 'Tab') {
        const focusableElements = containerRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      
      // Return focus to previous element
      if (returnFocusRef?.current) {
        returnFocusRef.current.focus();
      } else if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, closeOnEscape, trapFocus, onClose, initialFocusRef, returnFocusRef]);

  return containerRef;
}

