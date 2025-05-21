import React from 'react';
import { usePWA } from '../hooks/usePWA';
import { motion, AnimatePresence } from 'framer-motion';

export function PWAPrompt() {
  const { isUpdateAvailable, installPrompt, isInstalled, handleInstall, handleUpdate } = usePWA();

  if (!installPrompt && !isUpdateAvailable) return null;

  return (
    <AnimatePresence>
      {(installPrompt || isUpdateAvailable) && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-lg shadow-lg p-4 z-50"
        >
          {installPrompt && !isInstalled && (
            <div className="flex items-start">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Install Cars-G</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Install our app for a better experience and offline access
                </p>
              </div>
              <div className="ml-4 flex-shrink-0 flex space-x-2">
                <button
                  onClick={handleInstall}
                  className="bg-primary-color text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-color-dark transition-colors"
                >
                  Install
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="text-gray-500 hover:text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Not Now
                </button>
              </div>
            </div>
          )}

          {isUpdateAvailable && (
            <div className="flex items-start">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Update Available</h3>
                <p className="mt-1 text-sm text-gray-500">
                  A new version of Cars-G is available. Update now to get the latest features.
                </p>
              </div>
              <div className="ml-4 flex-shrink-0 flex space-x-2">
                <button
                  onClick={handleUpdate}
                  className="bg-primary-color text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-color-dark transition-colors"
                >
                  Update
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="text-gray-500 hover:text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Later
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
} 