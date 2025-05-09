import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { Reports } from './pages/Reports';
import { CreateReport } from './pages/CreateReport';
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

// Configure future flags for React Router v7
const routerConfig = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
};

function App() {
  const { initialize, isAuthenticated, user } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await initialize();
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsInitialized(true);
      }
    };
    init();
  }, [initialize]);

  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-color"></div>
      </div>
    );
  }

  return (
    <Router {...routerConfig}>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="pt-16 sm:pt-20">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route 
              path="/auth/callback" 
              element={
                <ProtectedRoute>
                  <Navigate to="/dashboard" replace />
                </ProtectedRoute>
              } 
            />
            
            {/* Protected routes */}
            <Route
              path="/dashboard"
              element={
                isAuthenticated ? (
                  <ProtectedRoute>
                    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
                      <Dashboard />
                    </div>
                  </ProtectedRoute>
                ) : (
                  <Navigate to="/login" state={{ from: { pathname: '/dashboard' } }} replace />
                )
              }
            />
            <Route
              path="/chat"
              element={
                isAuthenticated ? (
                  <ProtectedRoute>
                    <div className="h-[calc(100vh-4rem)] sm:h-[calc(100vh-5rem)]">
                      <Chat />
                    </div>
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
                    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
                      <Reports />
                    </div>
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
                    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
                      <CreateReport />
                    </div>
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
                    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
                      <LeaderboardPage />
                    </div>
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
                    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
                      <Profile />
                    </div>
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
                    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
                      <MapTestPage />
                    </div>
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
                    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
                      <AdminDashboard />
                    </div>
                  </ProtectedRoute>
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <Analytics />
    </Router>
  );
}

export default App;