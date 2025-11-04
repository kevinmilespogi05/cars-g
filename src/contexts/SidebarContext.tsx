import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  sidebarWidth: number; // in pixels
  collapsedWidth: number; // in pixels
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  // Sidebar widths: 288px (w-72) when open, 64px (w-16) when collapsed
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Check if we're on mobile first
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      return true; // Collapsed on mobile by default
    }
    // On desktop, check localStorage for persisted state
    try {
      const saved = localStorage.getItem('sidebarCollapsed');
      return saved === 'true';
    } catch {
      return false; // Default to open on desktop
    }
  });

  const sidebarWidth = 288; // w-72 = 18rem = 288px
  const collapsedWidth = 64; // w-16 = 4rem = 64px

  // Persist sidebar state to localStorage (only on desktop)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      try {
        localStorage.setItem('sidebarCollapsed', String(isCollapsed));
      } catch (error) {
        console.warn('Failed to save sidebar state:', error);
      }
    }
  }, [isCollapsed]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 1024;
      if (isMobile && !isCollapsed) {
        // On mobile, always collapse if not already collapsed
        setIsCollapsed(true);
      }
    };

    // Initial check
    const isMobile = window.innerWidth < 1024;
    if (isMobile && !isCollapsed) {
      setIsCollapsed(true);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isCollapsed, setIsCollapsed]);

  const toggleSidebar = () => {
    setIsCollapsed(prev => !prev);
  };

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed,
        setIsCollapsed,
        toggleSidebar,
        sidebarWidth,
        collapsedWidth,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebarContext() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebarContext must be used within a SidebarProvider');
  }
  return context;
}

