import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw, WifiIcon } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export function NetworkStatus() {
  const { isOnline, isChecking, connectionType, effectiveType, checkConnection, forceOnline } = useNetworkStatus();

  if (isOnline) return null;

  const getConnectionIcon = () => {
    switch (connectionType) {
      case 'wifi':
        return <Wifi className="h-5 w-5" />;
      case 'cellular':
        return <WifiIcon className="h-5 w-5" />;
      case 'ethernet':
        return <Wifi className="h-5 w-5" />;
      default:
        return <WifiOff className="h-5 w-5" />;
    }
  };

  const getConnectionText = () => {
    if (connectionType === 'cellular' && effectiveType !== 'unknown') {
      return `${effectiveType.toUpperCase()} connection`;
    }
    return connectionType === 'unknown' ? 'No internet connection' : `${connectionType} connection`;
  };

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
            {getConnectionIcon()}
            <div>
              <span className="font-medium">You're offline</span>
              <div className="text-sm opacity-90">
                {getConnectionText()} • Some features may be limited
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={forceOnline}
              className="flex items-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1.5 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
              title="Force online status (if you know you have connection)"
            >
              <Wifi className="h-4 w-4" />
              <span>Force Online</span>
            </button>
            <button
              onClick={checkConnection}
              disabled={isChecking}
              className="flex items-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1.5 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 disabled:opacity-50"
            >
              {isChecking ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span>{isChecking ? 'Checking...' : 'Check Connection'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
