import React, { useEffect, useState, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SidebarNavigation } from './components/SidebarNavigation';
import { useAuthStore } from './store/authStore';
import { useImageViewerStore } from './store/imageViewerStore';
import { initializeAchievements } from './lib/initAchievements';
import { Providers } from './components/Providers';
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
import { ToastContainer } from './components/ToastContainer';
import { useSidebarContext } from './contexts/SidebarContext';
import { MobileOptimizationsProvider } from './components/MobileOptimizationsProvider';
import { SkipLink, OnboardingFlow, defaultOnboardingSteps } from './components/ui';
import { supabase } from './lib/supabase';
import { NotificationBell } from './components/ui/NotificationBell';
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-color mx-auto mb-4"></div>
      <p className="text-gray-600 text-lg">Loading Bantay SP...</p>
    </div>
  </div>
);

// Inner content component that uses sidebar context
function AppContentInner() {
  const { isAuthenticated, user, isAdminLike } = useAuthStore();
  const { isImageViewerOpen } = useImageViewerStore();
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { notifications, removeNotification } = useAchievementNotifications();
  const [showWelcomeGuide, setShowWelcomeGuide] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
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

  // Check if we're on pages that should not show footer
  const isNoFooterPage = location.pathname === '/reports' || 
                         location.pathname === '/announcements' || 
                         location.pathname === '/emergency-contacts' || 
                         location.pathname === '/leaderboard';

  // Show welcome guide only for truly new users (created in last 24 hours)
  useEffect(() => {
    if (isAuthenticated && user) {
      const checkIfNewUser = async () => {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('created_at')
            .eq('id', user.id)
            .single();
          
          if (data?.created_at) {
            const accountAge = Date.now() - new Date(data.created_at).getTime();
            const isNewUser = accountAge < 24 * 60 * 60 * 1000; // Less than 24 hours old
            
            // Also check if user has seen welcome before (per-user, not per-browser)
            const welcomeKey = `hasSeenWelcome_${user.id}`;
            const hasSeenWelcome = localStorage.getItem(welcomeKey);
            
            if (isNewUser && !hasSeenWelcome) {
              setShowWelcomeGuide(true);
              localStorage.setItem(welcomeKey, 'true');
            }
          }
        } catch (error) {
          console.error('Error checking if user is new:', error);
          // Don't show welcome guide if we can't verify
        }
      };
      
      checkIfNewUser();
    }
  }, [isAuthenticated, user]);

  // Check onboarding status
  useEffect(() => {
    if (isAuthenticated && user && !isAuthPage && !isLandingPage) {
      const checkOnboarding = async () => {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('onboarding_completed')
            .eq('id', user.id)
            .single();
          
          if (!data?.onboarding_completed) {
            setShowOnboarding(true);
          }
        } catch (error) {
          console.error('Error checking onboarding status:', error);
        }
      };
      checkOnboarding();
    }
  }, [isAuthenticated, user, isAuthPage, isLandingPage]);

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
        try { 
          localStorage.removeItem('supabase.auth.token'); 
        } catch (error) {
          // Silently handle localStorage errors (may fail in private browsing)
          console.warn('Failed to remove auth token from localStorage:', error);
        }

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
          
          {/* Floating Notification Bell */}
          {!isLandingPage && !isAuthPage && isAuthenticated && user && (
            <div className="fixed top-4 right-4 z-[3000] sm:top-6 sm:right-6">
              <NotificationBell />
            </div>
          )}
          
          {/* Skip to main content link for accessibility */}
          {!isLandingPage && !isAuthPage && <SkipLink />}
          
          <main 
            id="main-content"
            role="main"
            className={isLandingPage ? 'pt-0' : isAuthPage ? 'relative min-h-screen' : 'relative min-h-screen'}
            style={!isLandingPage && !isAuthPage ? ({
              marginLeft: isDesktop ? 'var(--app-left-offset)' : undefined,
              transition: 'margin-left 250ms cubic-bezier(0.4, 0, 0.2, 1)'
            } as React.CSSProperties) : undefined}
            tabIndex={-1}
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
          
          {/* Footer - only show on non-landing pages and non-auth pages and non-admin pages and when image viewer is not open and not on no-footer pages */}
          {!isLandingPage && !isAuthPage && !isAdminPage && !isImageViewerOpen && !isNoFooterPage && <Footer />}
          
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

          {/* Onboarding Flow */}
          {isAuthenticated && user && showOnboarding && (
            <OnboardingFlow
              steps={defaultOnboardingSteps}
              onComplete={() => setShowOnboarding(false)}
              onSkip={() => setShowOnboarding(false)}
            />
          )}

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