import React from 'react';
import { usePWA } from '../hooks/usePWA';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, RefreshCw, X } from 'lucide-react';

export function PWAPrompt() {
  const { isUpdateAvailable, installPrompt, isInstalled, handleInstall, handleUpdate, dismissUpdate, isIos } = usePWA();
  const [localInstallPrompt, setLocalInstallPrompt] = React.useState(installPrompt);
  const [showIosHint, setShowIosHint] = React.useState(() => {
    try {
      return !localStorage.getItem('pwa-ios-hint-dismissed');
    } catch (e) {
      return true;
    }
  });

  // Sync local state with prop
  React.useEffect(() => {
    setLocalInstallPrompt(installPrompt);
  }, [installPrompt]);

  React.useEffect(() => {
    // If installed or there is a programmatic install prompt, hide the iOS hint
    if (isInstalled || localInstallPrompt) {
      setShowIosHint(false);
    }
  }, [isInstalled, localInstallPrompt]);

  if (!localInstallPrompt && !isUpdateAvailable) return null;

  return (
    <AnimatePresence>
      {(localInstallPrompt || isUpdateAvailable) && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50"
        >
          {/* iOS Add to Home Screen hint when no programmatic prompt exists */}
          {isIos && !localInstallPrompt && !isInstalled && showIosHint && (
            <div className="mb-3 p-3 bg-yellow-50 border border-yellow-100 rounded">
              <div className="flex items-start">
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-yellow-800 mb-1">Add Cars-G to your Home Screen</h4>
                  <p className="text-xs text-yellow-900 mb-2">Tap the browser's <strong>Share</strong> button, then select <strong>Add to Home Screen</strong>.</p>
                  <p className="text-xs text-yellow-900">This installs the app shortcut on your iPhone for quick access.</p>
                </div>
                <div className="ml-3 flex-shrink-0">
                  <button
                    onClick={() => {
                      try { localStorage.setItem('pwa-ios-hint-dismissed', 'true'); } catch (e) {}
                      setShowIosHint(false);
                    }}
                    className="text-yellow-800 bg-yellow-100 px-3 py-1 rounded text-sm font-medium"
                  >Got it</button>
                </div>
              </div>
            </div>
          )}
          {localInstallPrompt && !isInstalled && (
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
                  onClick={() => {
                    // Dismiss the install prompt
                    setLocalInstallPrompt(null);
                  }}
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
                  <RefreshCw className="h-5 w-5 text-blue-500" />
                  <h3 className="text-lg font-semibold text-gray-900">Update Available</h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  A new version of Cars-G is available. Update now to get the latest features and improvements.
                </p>
              </div>
              <div className="ml-3 flex-shrink-0 flex flex-col space-y-2">
                <button
                  onClick={handleUpdate}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Update
                </button>
                <button
                  onClick={dismissUpdate}
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
