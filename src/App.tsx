import React, { useEffect, useState, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SidebarNavigation } from './components/SidebarNavigation';
import { useAuthStore } from './store/authStore';
import { useImageViewerStore } from './store/imageViewerStore';
import { initializeAchievements } from './lib/initAchievements';
import { Providers } from './components/Providers';
import { motion } from 'framer-motion';
import { ErrorBoundary } from './components/ErrorBoundary';
import { publicRoutes, protectedRoutes, adminRoutes, patrolRoutes } from './routes/routes';
import { PWAPrompt } from './components/PWAPrompt';
import { NetworkStatus } from './components/NetworkStatus';
import { QuickActions } from './components/QuickActions';
import { WelcomeGuide } from './components/WelcomeGuide';
import { VerificationPendingBanner } from './components/VerificationPendingBanner';

import { usePushNotifications } from './hooks/usePushNotifications';
import { useAchievementNotifications, AchievementNotification } from './components/AchievementNotification';
import { Footer } from './components/Footer';
import { useReducedMotion } from './hooks/useReducedMotion';
import { ToastContainer } from './components/ToastContainer';
import { useSidebarContext } from './contexts/SidebarContext';
import { MobileOptimizationsProvider } from './components/MobileOptimizationsProvider';


// Configure future flags for React Router v7
const routerConfig = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
};

const PageTransition = ({ children }: { children: React.ReactNode }) => {
  const shouldReduceMotion = useReducedMotion();
  
  return (
    <motion.div
      initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
      animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
      exit={shouldReduceMotion ? {} : { opacity: 0, y: -20 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
};

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-color mx-auto mb-4"></div>
      <p className="text-gray-600 text-lg">Loading Cars-G...</p>
    </div>
  </div>
);

const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
    <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md w-full">
      <div className="text-red-500 text-6xl mb-4">⚠️</div>
      <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
      <p className="text-sm text-gray-600 mb-6">We encountered an error while loading the app.</p>
      <pre className="text-xs text-gray-700 mb-6 bg-gray-100 p-3 rounded overflow-auto max-h-32">
        {error.message}
      </pre>
      <div className="space-y-3">
        <button
          onClick={resetErrorBoundary}
          className="w-full px-4 py-2 bg-primary-color text-white rounded hover:bg-primary-dark transition-colors"
        >
          Try again
        </button>
        <button
          onClick={() => window.location.reload()}
          className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
        >
          Reload page
        </button>
      </div>
    </div>
  </div>
);

// Mobile menu button component
function MobileMenuButton() {
  const { toggleSidebar, isCollapsed } = useSidebarContext();
  
  return (
    <button
      onClick={toggleSidebar}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleSidebar();
        }
      }}
      className="fixed top-4 left-4 z-menuButton lg:hidden p-2 rounded-lg bg-white/90 backdrop-blur-sm shadow-lg border border-gray-200 hover:bg-white transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 group"
      aria-label="Toggle navigation menu"
      aria-expanded={!isCollapsed}
      title={isCollapsed ? 'Open menu' : 'Close menu'}
    >
      <svg 
        className="h-6 w-6 text-gray-700 transition-transform duration-200 group-hover:scale-110" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor" 
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
}

// Inner content component that uses sidebar context
function AppContentInner() {
  const { isAuthenticated, user, isAdminLike } = useAuthStore();
  const { isImageViewerOpen } = useImageViewerStore();
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { notifications, removeNotification } = useAchievementNotifications();
  const [showWelcomeGuide, setShowWelcomeGuide] = useState(false);
  const { isCollapsed, sidebarWidth, collapsedWidth } = useSidebarContext();
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  
  // Update desktop state on resize
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  // Check if we're on the landing page (either / or /landing)
  const isLandingPage = location.pathname === '/' || location.pathname === '/landing';
  
  // Check if we're on login or register page
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  
  // Check if we're on any admin page
  const isAdminPage = location.pathname.startsWith('/admin');

  // Show welcome guide for new users
  useEffect(() => {
    if (isAuthenticated && user) {
      const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
      if (!hasSeenWelcome) {
        setShowWelcomeGuide(true);
        localStorage.setItem('hasSeenWelcome', 'true');
      }
    }
  }, [isAuthenticated, user]);

  // Mobile-specific fixes to prevent refresh loops (prod only and when offline)
  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isBypass = new URLSearchParams(window.location.search).has('bypassFix');

    // Only run this guard in production, on mobile, when offline, and not explicitly bypassed
    if (import.meta.env.PROD && isMobile && !navigator.onLine && !isBypass) {
      console.log('Mobile device offline detected, applying refresh-loop guard');

      const now = Date.now();
      const lastTs = parseInt(sessionStorage.getItem('refreshTs') || '0');
      let refreshCount = parseInt(sessionStorage.getItem('refreshCount') || '0');
      const withinWindow = now - lastTs < 60 * 1000; // 1 minute window
      const maxRefreshes = 3;

      refreshCount = withinWindow ? refreshCount + 1 : 1;
      sessionStorage.setItem('refreshCount', refreshCount.toString());
      sessionStorage.setItem('refreshTs', now.toString());

      if (refreshCount >= maxRefreshes) {
        console.warn('Too many refreshes while offline on mobile; redirecting to fix page');
        // Clear volatile state only
        sessionStorage.clear();
        try { localStorage.removeItem('supabase.auth.token'); } catch {}

        if (window.location.pathname !== '/fix-offline.html') {
          window.location.href = '/fix-offline.html';
          return;
        }
      }

      // Reduce SW aggressiveness when offline
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (event) => {
          if ((event as any).data && (event as any).data.type === 'SKIP_WAITING') {
            console.log('Preventing automatic service worker update while offline on mobile');
            event.preventDefault?.();
          }
        });
      }
    }
  }, []);

  // Initialize push notifications when authenticated
  usePushNotifications({ userId: isAuthenticated ? user?.id || null : null, enabled: true });

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 relative" style={{ ['--app-left-offset' as any]: isDesktop ? (isCollapsed ? `${collapsedWidth}px` : `${sidebarWidth}px`) : '0px' }}>
          {/* Mobile Optimizations Provider - Initialize mobile fixes */}
          <MobileOptimizationsProvider />

          {/* Verification Pending Banner */}
          {isAuthenticated && <VerificationPendingBanner />}
          
          {/* Blurred Background Wallpaper - Show on all pages except landing */}
          {!isLandingPage && (
            <>
              <div 
                className="fixed inset-0 z-0"
                style={{
                  backgroundImage: 'url(/images/Castillejos,Zambalesjf7377_05.JPG)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  filter: 'blur(4px) brightness(1.1)',
                  transform: 'scale(1.05)'
                }}
                aria-hidden="true"
              />
              {/* Overlay for better content readability */}
              <div 
                className="fixed inset-0 z-0 bg-white/75"
                aria-hidden="true"
              />
            </>
          )}
          
          {/* Only show SidebarNavigation on non-landing and non-auth pages */}
          {!isLandingPage && !isAuthPage && <SidebarNavigation />}
          
          
          <main 
            className={isLandingPage ? 'pt-0' : isAuthPage ? 'relative min-h-screen' : 'relative min-h-screen'}
            style={!isLandingPage && !isAuthPage ? ({
              marginLeft: isDesktop ? 'var(--app-left-offset)' : undefined,
              transition: 'margin-left 250ms cubic-bezier(0.4, 0, 0.2, 1)'
            } as React.CSSProperties) : undefined}
          >
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                {publicRoutes.map((route) => (
                  <Route key={route.path} {...route} />
                ))}
                {isAuthenticated &&
                  protectedRoutes.map((route) => (
                    <Route key={route.path} {...route} />
                  ))}
                {isAuthenticated &&
                  isAdminLike() &&
                  adminRoutes.map((route) => (
                    <Route key={route.path} {...route} />
                  ))}
                {isAuthenticated &&
                  user?.role === 'patrol' &&
                  patrolRoutes.map((route) => (
                    <Route key={route.path} {...route} />
                  ))}
                <Route
                  path="*"
                  element={<Navigate to={isAuthenticated ? (isAdminLike() ? "/admin" : user?.role === 'patrol' ? '/patrol' : "/reports") : "/login"} replace />}
                />
              </Routes>
            </Suspense>
          </main>
          
          {/* Footer - only show on non-landing pages and non-auth pages and non-admin pages and when image viewer is not open */}
          {!isLandingPage && !isAuthPage && !isAdminPage && !isImageViewerOpen && <Footer />}
          
          {/* Network Status Indicator */}
          {!isOnline && (
            <NetworkStatus />
          )}
          
          {/* PWA Install Prompt */}
          <PWAPrompt />

          {/* Achievement Notifications */}
          {notifications.map((notification) => (
            <AchievementNotification
              key={notification.id}
              achievementId={notification.achievementId}
              title={notification.title}
              points={notification.points}
              icon={notification.icon}
              onClose={() => removeNotification(notification.id)}
            />
          ))}

          {/* Welcome Guide */}
          <WelcomeGuide
            isOpen={showWelcomeGuide}
            onClose={() => setShowWelcomeGuide(false)}
            userRole={user?.role}
          />

          {/* Toast Notifications */}
          <ToastContainer />

          {/* Mobile Floating Quick Actions (bottom-left) - use app-level placement so fixed positioning is reliable */}
          {!isLandingPage && !isAuthPage && (
            <div className="lg:hidden">
              <QuickActions hideEmergencyActions />
            </div>
          )}
          
          {/* Analytics removed (Vercel analytics not installed) */}
        </div>
      );
    }

// Outer wrapper that provides context
function AppContent() {
  return (
    <ErrorBoundary>
      <Providers>
        <AppContentInner />
      </Providers>
    </ErrorBoundary>
  );
}

function App() {
  const { initialize } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await initialize();
        await initializeAchievements();
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsInitialized(true);
      }
    };
    init();
  }, [initialize]);

  if (!isInitialized) {
    return <LoadingSpinner />;
  }

  return <AppContent />;
}

export default App;