import { useEffect, useState, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { useAuthStore } from './store/authStore';
import { Analytics } from "@vercel/analytics/react";
import { initializeAchievements } from './lib/initAchievements';
import { Providers } from './components/Providers';
// Removed unused motion import
import { ErrorBoundary } from './components/ErrorBoundary';
import { publicRoutes, protectedRoutes, adminRoutes } from './routes/routes';
import { PWAPrompt } from './components/PWAPrompt';

// Loading spinner component for suspense fallback
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-color"></div>
  </div>
);

function App() {
  const { initialize, isAuthenticated, user } = useAuthStore();
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

  return (
    <ErrorBoundary>
      <Providers>
        <div className="min-h-screen bg-gray-100">
          <Navigation />
          <main className="pt-16 sm:pt-20">
            <Routes>
              {publicRoutes.map((route) => (
                <Route 
                  key={route.path} 
                  path={route.path} 
                  element={
                    <Suspense fallback={<LoadingSpinner />}>
                      {route.element}
                    </Suspense>
                  } 
                />
              ))}
              {isAuthenticated &&
                protectedRoutes.map((route) => (
                  <Route 
                    key={route.path} 
                    path={route.path} 
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        {route.element}
                      </Suspense>
                    } 
                  />
                ))}
              {isAuthenticated &&
                user?.role === 'admin' &&
                adminRoutes.map((route) => (
                  <Route 
                    key={route.path} 
                    path={route.path} 
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        {route.element}
                      </Suspense>
                    } 
                  />
                ))}
              <Route
                path="*"
                element={<Navigate to={isAuthenticated ? "/reports" : "/login"} replace />}
              />
            </Routes>
          </main>
          <PWAPrompt />
        </div>
        <Analytics />
      </Providers>
    </ErrorBoundary>
  );
}

export default App;