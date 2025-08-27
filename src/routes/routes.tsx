import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';

// Lazy load components
const Login = lazy(() => import('../pages/Login').then(module => ({ default: module.Login })));
const Register = lazy(() => import('../pages/Register').then(module => ({ default: module.Register })));
const AuthCallback = lazy(() => import('../pages/AuthCallback').then(module => ({ default: module.AuthCallback })));
const Reports = lazy(() => import('../pages/Reports').then(module => ({ default: module.Reports })));
const CreateReport = lazy(() => import('../pages/CreateReport').then(module => ({ default: module.CreateReport })));
const ReportDetail = lazy(() => import('../pages/ReportDetail').then(module => ({ default: module.ReportDetail })));
const LeaderboardPage = lazy(() => import('../pages/LeaderboardPage').then(module => ({ default: module.LeaderboardPage })));
const Profile = lazy(() => import('../pages/Profile').then(module => ({ default: module.Profile })));
const MapTestPage = lazy(() => import('../pages/MapTestPage').then(module => ({ default: module.MapTestPage })));
const AdminDashboard = lazy(() => import('../pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const PrivacyPolicy = lazy(() => import('../pages/PrivacyPolicy').then(module => ({ default: module.PrivacyPolicy })));
const Chat = lazy(() => import('../pages/Chat').then(module => ({ default: module.Chat })));
const NetworkTest = lazy(() => import('../pages/NetworkTest').then(module => ({ default: module.NetworkTest })));
const AdminMapDashboard = lazy(() => import('../components/AdminMapDashboard').then(module => ({ default: module.AdminMapDashboard })));

export const publicRoutes: RouteObject[] = [
  {
    path: '/',
    element: <Login />
  },
  {
    path: '/login',
    element: <Login />
  },
  {
    path: '/register',
    element: <Register />
  },
  {
    path: '/auth/callback',
    element: <AuthCallback />
  },
  {
    path: '/privacy-policy',
    element: <PrivacyPolicy />
  }
];

export const protectedRoutes: RouteObject[] = [
  {
    path: '/reports',
    element: <ProtectedRoute adminRedirect={true}><Reports /></ProtectedRoute>
  },
  {
    path: '/reports/create',
    element: <ProtectedRoute adminRedirect={true}><CreateReport /></ProtectedRoute>
  },
  {
    path: '/reports/:id',
    element: <ProtectedRoute><ReportDetail /></ProtectedRoute>
  },
  {
    path: '/leaderboard',
    element: <ProtectedRoute><LeaderboardPage /></ProtectedRoute>
  },
  {
    path: '/profile',
    element: <ProtectedRoute><Profile /></ProtectedRoute>
  },
  {
    path: '/profile/:id',
    element: <ProtectedRoute><Profile /></ProtectedRoute>
  },
  {
    path: '/map-test',
    element: <ProtectedRoute adminRedirect={true}><MapTestPage /></ProtectedRoute>
  },
  {
    path: '/chat',
    element: <ProtectedRoute><Chat /></ProtectedRoute>
  },
  {
    path: '/network-test',
    element: <ProtectedRoute adminRedirect={true}><NetworkTest /></ProtectedRoute>
  }
];

export const adminRoutes: RouteObject[] = [
  {
    path: '/admin',
    element: <ProtectedRoute><AdminDashboard /></ProtectedRoute>
  },
  {
    path: '/admin/map',
    element: <ProtectedRoute><AdminMapDashboard /></ProtectedRoute>
  }
]; 