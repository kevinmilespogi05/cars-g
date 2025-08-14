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
        initial={{ opacity: 0, y: -100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -100 }}
        className="fixed top-0 left-0 right-0 bg-red-500 text-white px-4 py-3 z-50 shadow-lg"
      >
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <WifiOff className="h-5 w-5" />
            <span className="font-medium">You're offline</span>
            <span className="text-sm opacity-90">Some features may be limited</span>
          </div>
          <button
            onClick={checkConnection}
            disabled={isChecking}
            className="flex items-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1.5 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 disabled:opacity-50"
          >
            {isChecking ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Wifi className="h-4 w-4" />
            )}
            <span>{isChecking ? 'Checking...' : 'Check Connection'}</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
