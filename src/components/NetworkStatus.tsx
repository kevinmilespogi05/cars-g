import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      // Try to fetch a small resource to test connection
      await fetch('/manifest.webmanifest', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      if (!navigator.onLine) {
        // Force online status update
        window.dispatchEvent(new Event('online'));
      }
    } catch (error) {
      console.log('Still offline');
    } finally {
      setIsChecking(false);
    }
  };

  if (isOnline) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-red-50 border border-red-200 rounded-lg shadow-lg p-4 z-50"
      >
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <WifiOff className="h-5 w-5 text-red-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-red-800">
              You're offline
            </h3>
            <p className="mt-1 text-sm text-red-700">
              Some features may not work without an internet connection.
            </p>
            
            <div className="mt-3 flex space-x-2">
              <button
                onClick={checkConnection}
                disabled={isChecking}
                className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isChecking ? (
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Wifi className="h-3 w-3 mr-1" />
                )}
                {isChecking ? 'Checking...' : 'Check Connection'}
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
