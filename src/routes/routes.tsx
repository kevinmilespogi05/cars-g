import { lazy, Suspense, Component } from 'react';
import { RouteObject } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';

// Loading component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#800000]"></div>
  </div>
);

// Error Boundary Component
class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Route Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h1 className="text-2xl font-bold text-red-800">Something went wrong</h1>
          <p className="text-gray-600 mt-2">Please try refreshing the page</p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Lazy load components with Suspense
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

// Wrap component with Suspense and ErrorBoundary
const withSuspense = (Component: React.ComponentType) => (
  <ErrorBoundary>
    <Suspense fallback={<LoadingFallback />}>
      <Component />
    </Suspense>
  </ErrorBoundary>
);

export const publicRoutes: RouteObject[] = [
  {
    path: '/',
    element: withSuspense(Login)
  },
  {
    path: '/login',
    element: withSuspense(Login)
  },
  {
    path: '/register',
    element: withSuspense(Register)
  },
  {
    path: '/privacy-policy',
    element: withSuspense(PrivacyPolicy)
  }
];

export const protectedRoutes: RouteObject[] = [
  {
    path: '/reports',
    element: <ProtectedRoute>{withSuspense(Reports)}</ProtectedRoute>
  },
  {
    path: '/reports/create',
    element: <ProtectedRoute>{withSuspense(CreateReport)}</ProtectedRoute>
  },
  {
    path: '/reports/:id',
    element: <ProtectedRoute>{withSuspense(ReportDetail)}</ProtectedRoute>
  },
  {
    path: '/leaderboard',
    element: <ProtectedRoute>{withSuspense(LeaderboardPage)}</ProtectedRoute>
  },
  {
    path: '/profile',
    element: <ProtectedRoute>{withSuspense(Profile)}</ProtectedRoute>
  },
  {
    path: '/profile/:id',
    element: <ProtectedRoute>{withSuspense(Profile)}</ProtectedRoute>
  },
  {
    path: '/map-test',
    element: <ProtectedRoute>{withSuspense(MapTestPage)}</ProtectedRoute>
  },
  {
    path: '/chat',
    element: <ProtectedRoute>{withSuspense(Chat)}</ProtectedRoute>
  }
];

export const adminRoutes: RouteObject[] = [
  {
    path: '/admin',
    element: <ProtectedRoute>{withSuspense(AdminDashboard)}</ProtectedRoute>
  }
]; 