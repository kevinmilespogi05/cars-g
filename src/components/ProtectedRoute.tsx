import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminRedirect?: boolean; // New prop to indicate if admin users should be redirected
}

export function ProtectedRoute({ children, adminRedirect = false }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to login page but save the attempted location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If a banned user somehow has a session, kick them to login with message
  if (user?.is_banned) {
    return (
      <Navigate
        to="/login"
        state={{ from: location, message: 'Your account has been banned. Please contact support if you believe this is a mistake.' }}
        replace
      />
    );
  }

  // Redirect admin users to admin/map if this route is meant for regular users
  if (adminRedirect && user?.role === 'admin') {
    return <Navigate to="/admin/map" replace />;
  }

  return <>{children}</>;
} 