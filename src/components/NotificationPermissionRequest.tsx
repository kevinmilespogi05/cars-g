import React, { useState, useEffect } from 'react';
import { BellIcon, BellOffIcon, XIcon } from 'lucide-react';

interface NotificationPermissionRequestProps {
  onPermissionGranted?: () => void;
  onDismiss?: () => void;
}

export const NotificationPermissionRequest: React.FC<NotificationPermissionRequestProps> = ({
  onPermissionGranted,
  onDismiss
}) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isVisible, setIsVisible] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    // Check current permission status
    if ('Notification' in window) {
      setPermission(Notification.permission);
      
      // Show the request if permission hasn't been set yet
      if (Notification.permission === 'default') {
        setIsVisible(true);
      }
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support notifications');
      return;
    }

    setIsRequesting(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        setIsVisible(false);
        onPermissionGranted?.();
        
        // Show success notification
        new Notification('Notifications Enabled! 🎉', {
          body: 'You will now receive push notifications for important updates',
          icon: '/pwa-192x192.png',
          tag: 'permission-granted'
        });
      } else if (result === 'denied') {
        // Show instructions for manual enable
        alert('Notifications were denied. To enable them later:\n\n1. Click the lock/info icon in your browser address bar\n2. Change "Notifications" to "Allow"\n3. Refresh the page');
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      alert('Failed to request notification permission. Please try again.');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  // Don't show if permission is already granted or denied
  if (!isVisible || permission !== 'default') {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-blue-50 border border-blue-200 rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-start">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <BellIcon className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-900">Enable Notifications</h3>
          </div>
          <p className="text-sm text-blue-800 leading-relaxed">
            Get notified when friends send you messages, even when the app is closed.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="ml-2 p-1 text-blue-400 hover:text-blue-600 transition-colors"
          title="Dismiss"
        >
          <XIcon size={16} />
        </button>
      </div>
      <div className="mt-3 flex space-x-2">
        <button
          onClick={requestPermission}
          disabled={isRequesting}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {isRequesting ? 'Requesting...' : 'Enable Notifications'}
        </button>
        <button
          onClick={handleDismiss}
          className="text-blue-600 hover:text-blue-800 px-3 py-2 rounded text-sm font-medium transition-colors focus:outline-none"
        >
          Not Now
        </button>
      </div>
    </div>
  );
};
