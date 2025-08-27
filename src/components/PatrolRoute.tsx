import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface PatrolRouteProps {
  children: React.ReactNode;
}

export function PatrolRoute({ children }: PatrolRouteProps) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/patrol/login" state={{ from: location }} replace />;
  }

  if (user?.role !== 'patrol') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default PatrolRoute;


