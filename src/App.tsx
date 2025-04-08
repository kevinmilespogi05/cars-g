import React, { useEffect } from 'react';
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

// Configure future flags for React Router v7
const routerConfig = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
};

function App() {
  const { initialize, isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Router {...routerConfig}>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="pt-16">
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
                    <div className="container mx-auto px-4 py-8">
                      <Dashboard />
                    </div>
                  </ProtectedRoute>
                ) : (
                  <Navigate to="/login" state={{ from: { pathname: '/dashboard' } }} replace />
                )
              }
            />
            <Route
              path="/reports"
              element={
                isAuthenticated ? (
                  <ProtectedRoute>
                    <div className="container mx-auto px-4 py-8">
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
                    <div className="container mx-auto px-4 py-8">
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
                    <div className="container mx-auto px-4 py-8">
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
                    <div className="container mx-auto px-4 py-8">
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
                    <div className="container mx-auto px-4 py-8">
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
                    <div className="container mx-auto px-4 py-8">
                      <AdminDashboard />
                    </div>
                  </ProtectedRoute>
                ) : (
                  <Navigate to="/login" state={{ from: { pathname: '/admin' } }} replace />
                )
              }
            />
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;