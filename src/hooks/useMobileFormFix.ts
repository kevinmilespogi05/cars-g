import { useEffect, useRef, useCallback } from 'react';
import { useMobileOptimization, useKeyboardVisible } from './useMobileOptimization';

/**
 * useMobileFormFix Hook
 * 
 * Improves form handling on mobile devices:
 * - Prevents zoom on input focus
 * - Improves keyboard appearance and dismissal
 * - Better touch target sizing
 * - Proper input scrolling on mobile
 */
export function useMobileFormFix() {
  const { isMobile } = useMobileOptimization();
  const isKeyboardVisible = useKeyboardVisible();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!isMobile) return;

    // Fix 1: Prevent iOS zoom on input focus
    const inputs = document.querySelectorAll(
      'input[type="text"], input[type="email"], input[type="password"], input[type="number"], input[type="tel"], input[type="url"], textarea, select'
    );

    inputs.forEach(input => {
      const el = input as HTMLInputElement;
      
      // Set font size to 16px to prevent zoom
      el.style.fontSize = '16px';
      el.style.fontFamily = 'sans-serif';
      
      // Handle focus - scroll the input into view
      el.addEventListener('focus', () => {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300); // Wait for keyboard to appear
      }, { passive: true });
    });

    return () => {
      inputs.forEach(input => {
        (input as HTMLInputElement).removeEventListener('focus', () => {});
      });
    };
  }, [isMobile]);

  // Improved form submission on mobile
  const handleMobileFormSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    if (isMobile) {
      // Scroll to top to show success messages
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
  }, [isMobile]);

  // Dismiss keyboard on mobile when needed
  const dismissKeyboard = useCallback(() => {
    if (isMobile && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [isMobile]);

  return {
    formRef,
    isKeyboardVisible,
    handleMobileFormSubmit,
    dismissKeyboard,
  };
}

/**
 * useMobileTouchTargets Hook
 * 
 * Ensures all interactive elements meet minimum touch target size (44x44px)
 */
export function useMobileTouchTargets() {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @media (max-width: 768px) {
        /* Ensure all buttons meet minimum touch target size */
        button, 
        [role="button"], 
        a[role="button"],
        .btn,
        [type="submit"],
        [type="button"],
        [type="reset"] {
          min-height: 44px !important;
          min-width: 44px !important;
          padding: 12px 16px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        /* Touch-friendly links */
        a {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          padding: 8px 12px;
        }

        /* Input fields - larger on mobile */
        input, 
        textarea, 
        select {
          min-height: 44px !important;
          padding: 12px 16px !important;
          font-size: 16px !important;
        }

        /* Radio buttons and checkboxes */
        input[type="radio"],
        input[type="checkbox"] {
          min-height: 24px !important;
          min-width: 24px !important;
          cursor: pointer !important;
        }

        /* Ensure proper spacing around touch targets */
        button:not(:last-child),
        a[role="button"]:not(:last-child) {
          margin-right: 8px !important;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);
}

/**
 * useMobileInputBehavior Hook
 * 
 * Improves input behavior on mobile:
 * - Better autocorrect handling
 * - Proper number input keyboards
 * - Better email input keyboards
 */
export function useMobileInputBehavior() {
  useEffect(() => {
    const inputs = document.querySelectorAll('input, textarea, select');

    inputs.forEach(input => {
      const el = input as HTMLInputElement;

      // Improve autocorrect and spellcheck
      el.setAttribute('spellcheck', 'false');
      el.setAttribute('autocorrect', 'off');
      el.setAttribute('autocapitalize', 'off');

      // Add appropriate input modes for better mobile keyboards
      switch (el.type) {
        case 'tel':
          el.setAttribute('inputmode', 'tel');
          break;
        case 'email':
          el.setAttribute('inputmode', 'email');
          break;
        case 'number':
          el.setAttribute('inputmode', 'decimal');
          break;
        case 'url':
          el.setAttribute('inputmode', 'url');
          break;
        default:
          if (el.name?.includes('email')) {
            el.setAttribute('inputmode', 'email');
          } else if (el.name?.includes('phone')) {
            el.setAttribute('inputmode', 'tel');
          }
      }
    });
  }, []);
}

/**
 * Mobile form error display hook
 */
export function useMobileFormErrors() {
  useEffect(() => {
    // Listen for invalid form submissions on mobile
    const handleInvalidSubmit = (e: Event) => {
      if (e.target instanceof HTMLFormElement) {
        const form = e.target as HTMLFormElement;
        
        // Find first invalid input
        const invalidInput = form.querySelector(':invalid') as HTMLInputElement;
        
        if (invalidInput) {
          // Scroll to the invalid field
          setTimeout(() => {
            invalidInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            invalidInput.focus();
          }, 100);
        }
      }
    };

    document.addEventListener('invalid', handleInvalidSubmit, true);
    
    return () => {
      document.removeEventListener('invalid', handleInvalidSubmit, true);
    };
  }, []);
}

/**
 * useMobileFormKeyboard Hook
 * 
 * Handles keyboard appearance and dismissal on mobile
 */
export function useMobileFormKeyboard() {
  const handleInputBlur = useCallback(() => {
    // Dismiss keyboard
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement) {
      activeElement.blur();
    }
  }, []);

  const handleEnterKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      // Ctrl+Enter to submit form (works well on mobile)
      const form = (e.target as HTMLElement).closest('form') as HTMLFormElement;
      if (form) {
        form.submit();
      }
    }
  }, []);

  return {
    handleInputBlur,
    handleEnterKey,
  };
}
