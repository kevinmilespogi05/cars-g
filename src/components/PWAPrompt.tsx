import React from 'react';
import { usePWA } from '../hooks/usePWA';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, RefreshCw, X } from 'lucide-react';

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
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50"
        >
          {installPrompt && !isInstalled && (
            <div className="flex items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <Download className="h-5 w-5 text-primary-color" />
                  <h3 className="text-lg font-semibold text-gray-900">Install Cars-G</h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Install our app for a better experience, offline access, and faster loading times.
                </p>
              </div>
              <div className="ml-3 flex-shrink-0 flex flex-col space-y-2">
                <button
                  onClick={handleInstall}
                  className="bg-primary-color text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-color"
                >
                  Install
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded text-sm font-medium transition-colors focus:outline-none"
                >
                  Not Now
                </button>
              </div>
            </div>
          )}

          {isUpdateAvailable && (
            <div className="flex items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <RefreshCw className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Update Available</h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  A new version of Cars-G is available with bug fixes and new features.
                </p>
              </div>
              <div className="ml-3 flex-shrink-0 flex flex-col space-y-2">
                <button
                  onClick={handleUpdate}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Update
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded text-sm font-medium transition-colors focus:outline-none"
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