import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useEffect, useState } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, user, initialize } = useAuthStore();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        setIsLoading(true);
        // Initialize auth state if needed
        await initialize();
        // Add a small delay to ensure state is updated
        await new Promise(resolve => setTimeout(resolve, 200));
        
        if (mounted) {
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error checking auth state:', err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Authentication error'));
          setIsLoading(false);
        }
      }
    };
    
    checkAuth();

    return () => {
      mounted = false;
    };
  }, [initialize]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#800000]"></div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-red-800">Authentication Error</h1>
        <p className="text-gray-600 mt-2">{error.message}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-[#800000] text-white rounded-lg hover:bg-[#600000] transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    // Redirect to login page but save the attempted location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
} 