import React, { useEffect, useState, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { useAuthStore } from './store/authStore';
import { Analytics } from "@vercel/analytics/react";
import { initializeAchievements } from './lib/initAchievements';
import { Providers } from './components/Providers';
import { EnhancedChatProvider } from './contexts/EnhancedChatContext';
import { motion } from 'framer-motion';
import { ErrorBoundary } from './components/ErrorBoundary';
import { publicRoutes, protectedRoutes, adminRoutes, patrolRoutes } from './routes/routes';
import { PWAPrompt } from './components/PWAPrompt';
import { NetworkStatus } from './components/NetworkStatus';
import { WelcomeGuide } from './components/WelcomeGuide';

import { usePushNotifications } from './hooks/usePushNotifications';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import { useAchievementNotifications, AchievementNotification } from './components/AchievementNotification';

// Configure future flags for React Router v7
const routerConfig = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
};

const PageTransition = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);

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
      <pre className="text-xs text-gray-500 mb-6 bg-gray-100 p-3 rounded overflow-auto max-h-32">
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

function AppContent() {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { notifications, removeNotification } = useAchievementNotifications();
  const [showWelcomeGuide, setShowWelcomeGuide] = useState(false);

  // Check if we're on the landing page
  const isLandingPage = location.pathname === '/' && !isAuthenticated;

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
    <ErrorBoundary>
      <Providers>
        <EnhancedChatProvider>
          <div className="min-h-screen bg-gray-100">
          {/* Only show Navigation on non-landing pages */}
          {!isLandingPage && <Navigation />}
          <main className={isLandingPage ? 'pt-0' : 'pt-20 sm:pt-24'}>
            {!isLandingPage && (
              <div className="sticky top-0 z-40 h-6 -mt-6 bg-gradient-to-b from-[#800000] to-transparent pointer-events-none" />
            )}
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
                  user?.role === 'admin' &&
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
                  element={<Navigate to={isAuthenticated ? (user?.role === 'admin' ? "/admin/map" : user?.role === 'patrol' ? '/patrol' : "/reports") : "/login"} replace />}
                />
              </Routes>
            </Suspense>
          </main>
          
          {/* Network Status Indicator */}
          {!isOnline && (
            <NetworkStatus />
          )}
          
          {/* PWA Install Prompt */}
          <PWAPrompt />

          {/* Performance Monitor - only show in development or for admins */}
          {(import.meta.env.DEV || user?.role === 'admin') && (
            <PerformanceMonitor />
          )}

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
          </div>
          <Analytics />
        </EnhancedChatProvider>
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