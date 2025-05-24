import React from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { motion } from 'framer-motion';

interface FallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const ErrorFallback: React.FC<FallbackProps> = ({ error, resetErrorBoundary }) => {
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex items-center justify-center bg-gray-50"
    >
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg">
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
              onClick={resetErrorBoundary}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
}

export const AppErrorBoundary: React.FC<ErrorBoundaryProps> = ({ children, onReset }) => {
  const handleError = (error: Error) => {
    // Log error to your error tracking service
    console.error('Error caught by boundary:', error);
    
    // You could add additional error reporting here
    // For example, sending to an error tracking service like Sentry
    try {
      // Log additional context that might be helpful
      console.error('Error context:', {
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Failed to log error context:', e);
    }
  };

  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={onReset}
      onError={handleError}
    >
      {children}
    </ReactErrorBoundary>
  );
}; 