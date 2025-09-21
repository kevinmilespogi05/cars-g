import React, { useState, useEffect } from 'react';
import { usePWA } from '../hooks/usePWA';
import { Wifi, WifiOff, Download, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PWAStatusProps {
  showDetails?: boolean;
  className?: string;
}

export function PWAStatus({ showDetails = false, className = '' }: PWAStatusProps) {
  const { isUpdateAvailable, isInstalled, isOnline, handleUpdate, dismissUpdate } = usePWA();
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  useEffect(() => {
    if (isUpdateAvailable) {
      setShowUpdatePrompt(true);
    }
  }, [isUpdateAvailable]);

  const handleUpdateClick = () => {
    handleUpdate();
    setShowUpdatePrompt(false);
  };

  const handleDismissUpdate = () => {
    dismissUpdate();
    setShowUpdatePrompt(false);
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Online/Offline Status */}
      <div className="flex items-center space-x-1">
        {isOnline ? (
          <Wifi className="h-4 w-4 text-green-500" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-500" />
        )}
        {showDetails && (
          <span className="text-sm text-gray-600">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        )}
      </div>

      {/* PWA Installation Status */}
      {isInstalled && (
        <div className="flex items-center space-x-1">
          <CheckCircle className="h-4 w-4 text-green-500" />
          {showDetails && (
            <span className="text-sm text-gray-600">Installed</span>
          )}
        </div>
      )}

      {/* Update Available Prompt */}
      <AnimatePresence>
        {showUpdatePrompt && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50 max-w-sm"
          >
            <div className="flex items-start space-x-3">
              <RefreshCw className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">Update Available</h4>
                <p className="text-sm text-gray-600 mt-1">
                  A new version of Cars-G is available with improvements and bug fixes.
                </p>
                <div className="flex space-x-2 mt-3">
                  <button
                    onClick={handleUpdateClick}
                    className="bg-blue-500 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-600 transition-colors"
                  >
                    Update Now
                  </button>
                  <button
                    onClick={handleDismissUpdate}
                    className="text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded text-sm font-medium transition-colors"
                  >
                    Later
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline Warning */}
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-1 text-amber-600"
        >
          <AlertCircle className="h-4 w-4" />
          {showDetails && (
            <span className="text-sm">Limited functionality</span>
          )}
        </motion.div>
      )}
    </div>
  );
}
