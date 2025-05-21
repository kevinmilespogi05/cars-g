import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export const Offline = () => {
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    const checkConnection = () => {
      if (navigator.onLine) {
        window.location.reload();
      }
    };

    window.addEventListener('online', checkConnection);
    return () => window.removeEventListener('online', checkConnection);
  }, []);

  const handleRetry = () => {
    setIsReconnecting(true);
    setTimeout(() => {
      if (navigator.onLine) {
        window.location.reload();
      } else {
        setIsReconnecting(false);
      }
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center"
      >
        <motion.div
          animate={{ rotate: isReconnecting ? 360 : 0 }}
          transition={{ duration: 1, repeat: isReconnecting ? Infinity : 0 }}
          className="w-24 h-24 mx-auto mb-6"
        >
          <svg
            className="w-full h-full text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064"
            />
          </svg>
        </motion.div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          You're Offline
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          Please check your internet connection and try again. Your data is safely stored and will sync when you're back online.
        </p>
        <button
          onClick={handleRetry}
          disabled={isReconnecting}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors w-full disabled:opacity-50"
        >
          {isReconnecting ? 'Reconnecting...' : 'Try Again'}
        </button>
      </motion.div>
    </div>
  );
}; 