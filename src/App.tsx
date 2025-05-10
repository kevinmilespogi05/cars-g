import React, { useEffect, useState, Suspense } from 'react';
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-color"></div>
      </div>
    );
  }

  return (
    <Providers>
      <Router {...routerConfig}>
        <div className="min-h-screen bg-gray-100">
          <Navigation />
          <main className="pt-16 sm:pt-20">
            <AnimatePresence mode="wait">
              <Routes>
                {/* Public routes */}
                <Route path="/" element={
                  <PageTransition>
                    <Home />
                  </PageTransition>
                } />
                <Route path="/login" element={
                  <PageTransition>
                    <Login />
                  </PageTransition>
                } />
                <Route path="/register" element={
                  <PageTransition>
                    <Register />
                  </PageTransition>
                } />
                <Route path="/privacy-policy" element={
                  <PageTransition>
                    <PrivacyPolicy />
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
                            <Suspense fallback={
                              <div className="h-full flex items-center justify-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-color"></div>
                              </div>
                            }>
                              <Chat />
                            </Suspense>
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
                            <Reports />
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
                            <ReportDetail />
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
                            <CreateReport />
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
                            <LeaderboardPage />
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
                            <Profile />
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
                            <AdminDashboard />
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
            </AnimatePresence>
          </main>
        </div>
        <Analytics />
      </Router>
    </Providers>
  );
}

export default App;