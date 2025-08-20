import React, { useEffect, useState, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { Home } from './pages/Home';
import { Reports } from './pages/Reports';
import { CreateReport } from './pages/CreateReport';
import { ReportDetail } from './pages/ReportDetail';
import { Leaderboard } from './pages/Leaderboard';
import { Profile } from './pages/Profile';
import { IssueReportForm } from './components/IssueReportForm';
import { MapTestPage } from './pages/MapTestPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { useAuthStore } from './store/authStore';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { AdminDashboard } from './pages/AdminDashboard';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { Analytics } from "@vercel/analytics/react";
import { initializeAchievements } from './lib/initAchievements';
import { Providers } from './components/Providers';
import { motion, AnimatePresence } from 'framer-motion';
import { ErrorBoundary } from './components/ErrorBoundary';
import { publicRoutes, protectedRoutes, adminRoutes } from './routes/routes';
import { PWAPrompt } from './components/PWAPrompt';
import { NetworkStatus } from './components/NetworkStatus';
import { AIReportingButton } from './components/AIReportingButton';
import { usePushNotifications } from './hooks/usePushNotifications';

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

function App() {
  const { initialize, isAuthenticated, user } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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

  // Handle AI-generated report
  const handleAIReportGenerated = (reportData: {
    title: string;
    description: string;
    category: string;
    priority: 'low' | 'medium' | 'high';
    imageUrls: string[];
  }) => {
    // Store the AI-generated report data in localStorage
    // This will be picked up by the CreateReport page
    localStorage.setItem('aiGeneratedReport', JSON.stringify(reportData));
    
    // Navigate to the create report page
    window.location.href = '/reports/create';
  };

  if (!isInitialized) {
    return <LoadingSpinner />;
  }

  return (
    <ErrorBoundary>
      <Providers>
        <div className="min-h-screen bg-gray-100">
          <Navigation />
          <main className="pt-16 sm:pt-20">
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
                <Route
                  path="*"
                  element={<Navigate to={isAuthenticated ? "/reports" : "/login"} replace />}
                />
              </Routes>
            </Suspense>
          </main>
          
          {/* AI Reporting Button - Only show for authenticated users */}
          {isAuthenticated && (
            <AIReportingButton onReportGenerated={handleAIReportGenerated} />
          )}
          
          {/* Network Status Indicator */}
          {!isOnline && (
            <NetworkStatus />
          )}
          
          {/* PWA Install Prompt */}
          <PWAPrompt />
        </div>
        <Analytics />
      </Providers>
    </ErrorBoundary>
  );
}

export default App;