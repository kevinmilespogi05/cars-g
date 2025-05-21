import { useEffect, useCallback } from 'react';

interface KeyboardNavConfig {
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onEnter?: () => void;
  onEscape?: () => void;
  onTab?: (event: KeyboardEvent) => void;
  disabled?: boolean;
}

export const useKeyboardNav = ({
  onArrowUp,
  onArrowDown,
  onArrowLeft,
  onArrowRight,
  onEnter,
  onEscape,
  onTab,
  disabled = false
}: KeyboardNavConfig) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (disabled) return;

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          onArrowUp?.();
          break;
        case 'ArrowDown':
          event.preventDefault();
          onArrowDown?.();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          onArrowLeft?.();
          break;
        case 'ArrowRight':
          event.preventDefault();
          onArrowRight?.();
          break;
        case 'Enter':
          event.preventDefault();
          onEnter?.();
          break;
        case 'Escape':
          event.preventDefault();
          onEscape?.();
          break;
        case 'Tab':
          onTab?.(event);
          break;
        default:
          break;
      }
    },
    [disabled, onArrowUp, onArrowDown, onArrowLeft, onArrowRight, onEnter, onEscape, onTab]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}; 