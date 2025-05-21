import React, { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import { Chat } from './pages/Chat';
import { Analytics } from "@vercel/analytics/react";
import { initializeAchievements } from './lib/initAchievements';
import { Providers } from './components/Providers';
import { motion, AnimatePresence } from 'framer-motion';
import useOnlineStatus from './hooks/useOnlineStatus';
import { Offline } from './pages/Offline';
import { ThemeProvider } from './context/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeToggle } from './components/ThemeToggle';
import { AccessibilityProvider } from './context/AccessibilityContext';
import { SkipLink } from './components/SkipLink';

// Lazy load components
const HomeLazy = lazy(() => import('./pages/Home'));
const ReportsLazy = lazy(() => import('./pages/Reports'));
const CreateReportLazy = lazy(() => import('./pages/CreateReport'));
const ReportDetailLazy = lazy(() => import('./pages/ReportDetail'));
const LeaderboardLazy = lazy(() => import('./pages/Leaderboard'));
const ProfileLazy = lazy(() => import('./pages/Profile'));
const LoginLazy = lazy(() => import('./pages/Login'));
const RegisterLazy = lazy(() => import('./pages/Register'));
const AdminDashboardLazy = lazy(() => import('./pages/AdminDashboard'));
const PrivacyPolicyLazy = lazy(() => import('./pages/PrivacyPolicy'));
const ChatLazy = lazy(() => import('./pages/Chat'));
const OfflineLazy = lazy(() => import('./pages/Offline'));

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

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-[50vh] flex items-center justify-center" role="status" aria-label="Loading">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-color"></div>
  </div>
);

function App() {
  const { initialize, isAuthenticated, user } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const isOnline = useOnlineStatus();

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
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-color"></div>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <OfflineLazy />
      </Suspense>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AccessibilityProvider>
          <Providers>
            <Router {...routerConfig}>
              <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
                <SkipLink />
                <Navigation />
                <div className="fixed bottom-4 right-4 z-50">
                  <ThemeToggle />
                </div>
                <main id="main-content" tabIndex={-1} className="pt-16 sm:pt-20 focus:outline-none">
                  <AnimatePresence mode="wait">
                    <Suspense fallback={<LoadingSpinner />}>
                      <Routes>
                        {/* Public routes */}
                        <Route path="/" element={
                          <PageTransition>
                            <HomeLazy />
                          </PageTransition>
                        } />
                        <Route path="/login" element={
                          <PageTransition>
                            <LoginLazy />
                          </PageTransition>
                        } />
                        <Route path="/register" element={
                          <PageTransition>
                            <RegisterLazy />
                          </PageTransition>
                        } />
                        <Route path="/privacy-policy" element={
                          <PageTransition>
                            <PrivacyPolicyLazy />
                          </PageTransition>
                        } />
                        <Route 
                          path="/auth/callback" 
                          element={
                            <ProtectedRoute>
                              <PageTransition>
                                <Navigate to="/reports" replace />
                              </PageTransition>
                            </ProtectedRoute>
                          } 
                        />
                        
                        {/* Protected routes */}
                        <Route
                          path="/chat"
                          element={
                            isAuthenticated ? (
                              <ProtectedRoute>
                                <PageTransition>
                                  <div className="h-[calc(100vh-4rem)] sm:h-[calc(100vh-5rem)]">
                                    <ChatLazy />
                                  </div>
                                </PageTransition>
                              </ProtectedRoute>
                            ) : (
                              <Navigate to="/login" state={{ from: { pathname: '/chat' } }} replace />
                            )
                          }
                        />
                        <Route
                          path="/reports"
                          element={
                            isAuthenticated ? (
                              <ProtectedRoute>
                                <PageTransition>
                                  <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
                                    <ReportsLazy />
                                  </div>
                                </PageTransition>
                              </ProtectedRoute>
                            ) : (
                              <Navigate to="/login" state={{ from: { pathname: '/reports' } }} replace />
                            )
                          }
                        />
                        <Route
                          path="/reports/:id"
                          element={
                            isAuthenticated ? (
                              <ProtectedRoute>
                                <PageTransition>
                                  <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
                                    <ReportDetailLazy />
                                  </div>
                                </PageTransition>
                              </ProtectedRoute>
                            ) : (
                              <Navigate to="/login" state={{ from: { pathname: '/reports' } }} replace />
                            )
                          }
                        />
                        <Route
                          path="/reports/create"
                          element={
                            isAuthenticated ? (
                              <ProtectedRoute>
                                <PageTransition>
                                  <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
                                    <CreateReportLazy />
                                  </div>
                                </PageTransition>
                              </ProtectedRoute>
                            ) : (
                              <Navigate to="/login" state={{ from: { pathname: '/reports/create' } }} replace />
                            )
                          }
                        />
                        <Route
                          path="/leaderboard"
                          element={
                            isAuthenticated ? (
                              <ProtectedRoute>
                                <PageTransition>
                                  <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
                                    <LeaderboardLazy />
                                  </div>
                                </PageTransition>
                              </ProtectedRoute>
                            ) : (
                              <Navigate to="/login" state={{ from: { pathname: '/leaderboard' } }} replace />
                            )
                          }
                        />
                        <Route
                          path="/profile"
                          element={
                            isAuthenticated ? (
                              <ProtectedRoute>
                                <PageTransition>
                                  <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
                                    <ProfileLazy />
                                  </div>
                                </PageTransition>
                              </ProtectedRoute>
                            ) : (
                              <Navigate to="/login" state={{ from: { pathname: '/profile' } }} replace />
                            )
                          }
                        />
                        <Route
                          path="/map-test"
                          element={
                            isAuthenticated ? (
                              <ProtectedRoute>
                                <PageTransition>
                                  <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
                                    <MapTestPage />
                                  </div>
                                </PageTransition>
                              </ProtectedRoute>
                            ) : (
                              <Navigate to="/login" state={{ from: { pathname: '/map-test' } }} replace />
                            )
                          }
                        />
                        
                        {/* Admin routes */}
                        <Route
                          path="/admin"
                          element={
                            isAuthenticated && user?.role === 'admin' ? (
                              <ProtectedRoute>
                                <PageTransition>
                                  <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
                                    <AdminDashboardLazy />
                                  </div>
                                </PageTransition>
                              </ProtectedRoute>
                            ) : (
                              <Navigate to="/" replace />
                            )
                          }
                        />
                        
                        {/* Catch all route */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </Suspense>
                  </AnimatePresence>
                </main>
                <Analytics />
              </div>
            </Router>
          </Providers>
        </AccessibilityProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;