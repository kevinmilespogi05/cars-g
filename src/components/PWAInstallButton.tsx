import React, { useState, useEffect } from 'react';
import { usePWA } from '../hooks/usePWA';
import { Download, Smartphone, Monitor, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PWAInstallButtonProps {
  className?: string;
  showInstructions?: boolean;
}

export function PWAInstallButton({ className = '', showInstructions = true }: PWAInstallButtonProps) {
  const { installPrompt, isInstalled, handleInstall } = usePWA();
  const [showModal, setShowModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Check if user has dismissed the install prompt
  useEffect(() => {
    const dismissedKey = 'pwa-install-dismissed';
    const dismissedValue = localStorage.getItem(dismissedKey);
    if (dismissedValue) {
      setDismissed(true);
    }
  }, []);

  // Show install prompt after a delay if not dismissed and not installed
  useEffect(() => {
    if (!installPrompt || isInstalled || dismissed) return;

    const timer = setTimeout(() => {
      setShowModal(true);
    }, 3000); // Show after 3 seconds

    return () => clearTimeout(timer);
  }, [installPrompt, isInstalled, dismissed]);

  const handleDismiss = () => {
    setShowModal(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  const handleInstallClick = async () => {
    await handleInstall();
    setShowModal(false);
  };

  // Don't show if already installed, dismissed, or no install prompt
  if (isInstalled || dismissed || !installPrompt) {
    return null;
  }

  return (
    <>
      {/* Install Button */}
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center space-x-2 bg-primary-color text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-color ${className}`}
      >
        <Download className="h-4 w-4" />
        <span>Install App</span>
      </button>

      {/* Install Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={handleDismiss}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Install Cars-G</h3>
                <button
                  onClick={handleDismiss}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Install Cars-G for a better experience with offline access, faster loading, and native app features.
                </p>

                {showInstructions && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Smartphone className="h-5 w-5 text-primary-color" />
                      <div>
                        <p className="font-medium text-sm">Mobile (iOS/Android)</p>
                        <p className="text-xs text-gray-500">Tap the share button and select "Add to Home Screen"</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Monitor className="h-5 w-5 text-primary-color" />
                      <div>
                        <p className="font-medium text-sm">Desktop (Chrome/Edge)</p>
                        <p className="text-xs text-gray-500">Click the install button in your browser's address bar</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleInstallClick}
                  className="flex-1 bg-primary-color text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-color"
                >
                  Install Now
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors focus:outline-none"
                >
                  Not Now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
