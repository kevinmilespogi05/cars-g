import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { PatrolRoute } from '../components/PatrolRoute';

// Lazy load components
const LandingPage = lazy(() => import('../pages/LandingPage').then(module => ({ default: module.LandingPage })));
const Login = lazy(() => import('../pages/Login').then(module => ({ default: module.Login })));
const Register = lazy(() => import('../pages/Register').then(module => ({ default: module.Register })));
const PatrolDashboard = lazy(() => import('../pages/PatrolDashboard').then(module => ({ default: module.PatrolDashboard })));
const AuthCallback = lazy(() => import('../pages/AuthCallback').then(module => ({ default: module.AuthCallback })));
const Reports = lazy(() => import('../pages/Reports').then(module => ({ default: module.Reports })));
const CreateReport = lazy(() => import('../pages/CreateReport').then(module => ({ default: module.CreateReport })));
const ReportDetail = lazy(() => import('../pages/ReportDetail').then(module => ({ default: module.ReportDetail })));
const LeaderboardPage = lazy(() => import('../pages/LeaderboardPage').then(module => ({ default: module.LeaderboardPage })));
const Profile = lazy(() => import('../pages/Profile').then(module => ({ default: module.Profile })));
const AdminDashboard = lazy(() => import('../pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const PrivacyPolicy = lazy(() => import('../pages/PrivacyPolicy').then(module => ({ default: module.PrivacyPolicy })));
const AdminMapDashboard = lazy(() => import('../components/AdminMapDashboard').then(module => ({ default: module.AdminMapDashboard })));
const AdminHistory = lazy(() => import('../pages/AdminHistory').then(module => ({ default: module.AdminHistory })));
const AdminChat = lazy(() => import('../pages/AdminChat').then(module => ({ default: module.AdminChat })));
const VerificationReports = lazy(() => import('../pages/VerificationReports').then(module => ({ default: module.VerificationReports })));
const Announcements = lazy(() => import('../pages/Announcements').then(module => ({ default: module.Announcements })));
const CaseDetailsPage = lazy(() => import('../pages/CaseDetailsPage').then(module => ({ default: module.CaseDetailsPage })));

export const publicRoutes: RouteObject[] = [
  {
    path: '/',
    element: <LandingPage />
  },
  {
    path: '/landing',
    element: <LandingPage />
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
    element: <ProtectedRoute adminRedirect={true} patrolRedirect={true}><Reports /></ProtectedRoute>
  },
  {
    path: '/reports/create',
    element: <ProtectedRoute adminRedirect={true} patrolRedirect={true}><CreateReport /></ProtectedRoute>
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
    path: '/verification-reports',
    element: <ProtectedRoute adminRedirect={true} patrolRedirect={true}><VerificationReports /></ProtectedRoute>
  },
  {
    path: '/announcements',
    element: <ProtectedRoute><Announcements /></ProtectedRoute>
  }
];

export const patrolRoutes: RouteObject[] = [
  {
    path: '/patrol',
    element: <PatrolRoute><PatrolDashboard /></PatrolRoute>
  },
  {
    path: '/patrol/case/:caseId',
    element: <PatrolRoute><CaseDetailsPage /></PatrolRoute>
  }
];

export const adminRoutes: RouteObject[] = [
  {
    path: '/admin',
    element: <ProtectedRoute><AdminDashboard /></ProtectedRoute>
  },
  {
    path: '/admin/sample-case',
    element: <ProtectedRoute><AdminDashboard /></ProtectedRoute>
  },
  {
    path: '/admin/map',
    element: <ProtectedRoute><AdminMapDashboard /></ProtectedRoute>
  },
  {
    path: '/admin/history',
    element: <ProtectedRoute><AdminHistory /></ProtectedRoute>
  },
  {
    path: '/admin/chat',
    element: <ProtectedRoute><AdminChat /></ProtectedRoute>
  }
]; 