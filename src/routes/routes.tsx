import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';

// Lazy load components
const Login = lazy(() => import('../pages/Login').then(module => ({ default: module.Login })));
const Register = lazy(() => import('../pages/Register').then(module => ({ default: module.Register })));
const Reports = lazy(() => import('../pages/Reports').then(module => ({ default: module.Reports })));
const CreateReport = lazy(() => import('../pages/CreateReport').then(module => ({ default: module.CreateReport })));
const ReportDetail = lazy(() => import('../pages/ReportDetail').then(module => ({ default: module.ReportDetail })));
const LeaderboardPage = lazy(() => import('../pages/LeaderboardPage').then(module => ({ default: module.LeaderboardPage })));
const Profile = lazy(() => import('../pages/Profile').then(module => ({ default: module.Profile })));
const MapTestPage = lazy(() => import('../pages/MapTestPage').then(module => ({ default: module.MapTestPage })));
const AdminDashboard = lazy(() => import('../pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const PrivacyPolicy = lazy(() => import('../pages/PrivacyPolicy').then(module => ({ default: module.PrivacyPolicy })));
const Chat = lazy(() => import('../pages/Chat').then(module => ({ default: module.Chat })));

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
    path: '/privacy-policy',
    element: <PrivacyPolicy />
  }
];

export const protectedRoutes: RouteObject[] = [
  {
    path: '/reports',
    element: <ProtectedRoute><Reports /></ProtectedRoute>
  },
  {
    path: '/reports/create',
    element: <ProtectedRoute><CreateReport /></ProtectedRoute>
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
    element: <ProtectedRoute><MapTestPage /></ProtectedRoute>
  },
  {
    path: '/chat',
    element: <ProtectedRoute><Chat /></ProtectedRoute>
  }
];

export const adminRoutes: RouteObject[] = [
  {
    path: '/admin',
    element: <ProtectedRoute><AdminDashboard /></ProtectedRoute>
  }
]; 