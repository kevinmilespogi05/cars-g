import { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useAnalytics } from '../hooks/useAnalytics';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// Create a HOC to use hooks with class component
const withAnalytics = (WrappedComponent: typeof Component) => {
  return function WithAnalyticsComponent(props: Props) {
    const analytics = useAnalytics();
    return <WrappedComponent {...props} analytics={analytics} />;
  };
};

class ErrorBoundaryBase extends Component<Props & { analytics: ReturnType<typeof useAnalytics> }, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Track error with analytics
    this.props.analytics.trackError(error, errorInfo);
    
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Uncaught error:', error, errorInfo);
    }
  }

  private handleReload = () => {
    // Track reload attempt
    this.props.analytics.trackEvent({
      category: 'Error Recovery',
      action: 'Reload Page',
      label: this.state.error?.message
    });
    
    window.location.reload();
  };

  private handleGoHome = () => {
    // Track home navigation
    this.props.analytics.trackEvent({
      category: 'Error Recovery',
      action: 'Navigate Home',
      label: this.state.error?.message
    });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
            role="alert"
            aria-live="assertive"
          >
            <div className="text-center mb-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
                className="w-16 h-16 mx-auto mb-4 text-red-500"
              >
                <svg
                  className="w-full h-full"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </motion.div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Oops! Something went wrong
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                We've encountered an unexpected error. Our team has been notified.
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div 
                className="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-auto"
                role="region"
                aria-label="Error details"
              >
                <p className="font-mono text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <p className="mt-2 font-mono text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={this.handleReload}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Reload Page
              </motion.button>
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href="/"
                onClick={this.handleGoHome}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Go Home
              </motion.a>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const ErrorBoundary = withAnalytics(ErrorBoundaryBase); 