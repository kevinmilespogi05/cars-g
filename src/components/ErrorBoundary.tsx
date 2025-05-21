import React from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { motion } from 'framer-motion';

interface FallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const ErrorFallback: React.FC<FallbackProps> = ({ error, resetErrorBoundary }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-[400px] flex items-center justify-center p-4"
    >
      <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md w-full">
        <div className="text-red-500 text-5xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Oops! Something went wrong</h2>
        <div className="bg-red-50 p-4 rounded-md mb-4">
          <pre className="text-sm text-red-600 whitespace-pre-wrap font-mono">
            {error.message}
          </pre>
        </div>
        <p className="text-gray-600 mb-6">
          Don't worry! This is just a temporary hiccup. You can try:
        </p>
        <div className="space-y-2">
          <button
            onClick={resetErrorBoundary}
            className="w-full px-4 py-2 bg-primary-color text-white rounded-md hover:bg-primary-color-dark transition-colors duration-200"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200"
          >
            Refresh Page
          </button>
        </div>
        <p className="mt-4 text-sm text-gray-500">
          If the problem persists, please contact support.
        </p>
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