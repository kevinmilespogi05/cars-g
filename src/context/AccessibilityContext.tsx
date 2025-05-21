import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface AccessibilityContextType {
  focusVisible: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  textSize: number;
  toggleFocusVisible: () => void;
  toggleHighContrast: () => void;
  toggleReducedMotion: () => void;
  increaseTextSize: () => void;
  decreaseTextSize: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

interface AccessibilityProviderProps {
  children: ReactNode;
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [focusVisible, setFocusVisible] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [textSize, setTextSize] = useState(16);

  const toggleFocusVisible = useCallback(() => {
    setFocusVisible(prev => !prev);
    document.documentElement.classList.toggle('focus-visible');
  }, []);

  const toggleHighContrast = useCallback(() => {
    setHighContrast(prev => !prev);
    document.documentElement.classList.toggle('high-contrast');
  }, []);

  const toggleReducedMotion = useCallback(() => {
    setReducedMotion(prev => !prev);
    document.documentElement.classList.toggle('reduced-motion');
  }, []);

  const increaseTextSize = useCallback(() => {
    setTextSize(prev => Math.min(prev + 2, 24));
    document.documentElement.style.fontSize = `${textSize}px`;
  }, [textSize]);

  const decreaseTextSize = useCallback(() => {
    setTextSize(prev => Math.max(prev - 2, 12));
    document.documentElement.style.fontSize = `${textSize}px`;
  }, [textSize]);

  // Initialize preferences from system settings
  React.useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const prefersHighContrast = window.matchMedia('(prefers-contrast: more)').matches;
    
    setReducedMotion(prefersReducedMotion);
    setHighContrast(prefersHighContrast);
    
    if (prefersReducedMotion) {
      document.documentElement.classList.add('reduced-motion');
    }
    if (prefersHighContrast) {
      document.documentElement.classList.add('high-contrast');
    }
  }, []);

  const value = {
    focusVisible,
    highContrast,
    reducedMotion,
    textSize,
    toggleFocusVisible,
    toggleHighContrast,
    toggleReducedMotion,
    increaseTextSize,
    decreaseTextSize,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
} 