import React, { useCallback, useState, useEffect } from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { motion } from 'framer-motion';

interface FallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  fallbackRender?: (props: FallbackProps) => React.ReactNode;
}

const DefaultFallback: React.FC<FallbackProps> = ({ error, resetErrorBoundary }) => {
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = useCallback(async () => {
    setIsResetting(true);
    try {
      await resetErrorBoundary();
    } finally {
      setIsResetting(false);
    }
  }, [resetErrorBoundary]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg"
      >
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
          <div className="bg-red-50 p-4 rounded-md mb-4">
            <p className="text-sm text-red-800 font-mono overflow-auto max-h-40">
              {error.message}
            </p>
            {error.stack && (
              <details className="mt-2">
                <summary className="text-sm text-red-600 cursor-pointer hover:text-red-800">
                  View error details
                </summary>
                <pre className="mt-2 text-xs text-red-800 overflow-auto max-h-60 p-2 bg-red-100 rounded">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
          <div className="space-y-4">
            <button
              onClick={handleReset}
              disabled={isResetting}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResetting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Retrying...
                </span>
              ) : (
                'Try again'
              )}
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Reload page
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({
  children,
  onReset,
  onError,
  fallbackRender,
}) => {
  const [key, setKey] = useState(0);

  useEffect(() => {
    return () => {
      // Cleanup any resources, event listeners, or subscriptions
      // that might have been created by the error boundary
    };
  }, []);

  const handleError = useCallback((error: Error, errorInfo: React.ErrorInfo) => {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Log error to your error tracking service
    try {
      // Log additional context that might be helpful
      const errorContext = {
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        componentStack: errorInfo.componentStack,
      };
      console.error('Error context:', errorContext);
      
      // Call the provided error handler
      onError?.(error, errorInfo);
    } catch (e) {
      console.error('Failed to handle error:', e);
    }
  }, [onError]);

  const handleReset = useCallback(() => {
    // Reset any state that might have caused the error
    setKey(prev => prev + 1);
    onReset?.();
  }, [onReset]);

  return (
    <ReactErrorBoundary
      key={key}
      FallbackComponent={fallbackRender || DefaultFallback}
      onReset={handleReset}
      onError={handleError}
    >
      {children}
    </ReactErrorBoundary>
  );
};

// Add AppErrorBoundary export
export const AppErrorBoundary = ErrorBoundary;

export default ErrorBoundary; 