import { ErrorBoundary } from 'react-error-boundary';
import { Suspense, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';
import { ToastProvider } from '../contexts/ToastContext';
import { SidebarProvider } from '../contexts/SidebarContext';

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
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
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-lg shadow-md w-full max-w-md"
      >
        <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
        <pre className="bg-gray-100 p-4 rounded mb-4 overflow-auto text-sm">
          {error.message}
          {error.stack && (
            <details className="mt-2">
              <summary className="cursor-pointer text-gray-600">Stack trace</summary>
              <div className="mt-2 text-xs">{error.stack}</div>
            </details>
          )}
        </pre>
        <div className="flex gap-4">
          <button
            onClick={handleReset}
            disabled={isResetting}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResetting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
          >
            Reload page
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center"
      >
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-color"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </motion.div>
    </div>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Reset the state of your app here
      }}
    >
      <SidebarProvider>
        <ToastProvider>
          <Suspense fallback={<LoadingFallback />}>
            <AnimatePresence mode="sync" initial={false}>
              {React.Children.map(children, (child, index) => (
                <motion.div
                  key={`provider-child-${index}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {child}
                </motion.div>
              ))}
            </AnimatePresence>
          </Suspense>
        </ToastProvider>
      </SidebarProvider>
    </ErrorBoundary>
  );
} 