import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { BellIcon, BellOffIcon, SettingsIcon } from 'lucide-react';

interface NotificationSettings {
  chatNotifications: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  showPreview: boolean;
}

export const ChatNotificationSettings: React.FC = () => {
  const { user } = useAuthStore();
  const [settings, setSettings] = useState<NotificationSettings>({
    chatNotifications: true,
    soundEnabled: true,
    vibrationEnabled: true,
    showPreview: true,
  });
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);

  // Initialize push notifications
  usePushNotifications({ userId: user?.id || null, enabled: true });

  useEffect(() => {
    // Load saved settings from localStorage
    const savedSettings = localStorage.getItem('chatNotificationSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Failed to parse saved notification settings:', error);
      }
    }

    // Check current notification permission
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const saveSettings = (newSettings: Partial<NotificationSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    
    // Save to localStorage
    localStorage.setItem('chatNotificationSettings', JSON.stringify(updatedSettings));
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support notifications');
      return;
    }

    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        saveSettings({ chatNotifications: true });
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
    } finally {
      setLoading(false);
    }
  };

  const testNotification = async () => {
    if (permission !== 'granted') {
      alert('Please enable notifications first');
      return;
    }

    try {
      const notification = new Notification('Test Notification', {
        body: 'This is a test notification from Cars-G chat',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: 'test',
        requireInteraction: false,
        silent: !settings.soundEnabled,
        vibrate: settings.vibrationEnabled ? [200, 100, 200] : undefined,
      });

      // Auto-close after 3 seconds
      setTimeout(() => {
        notification.close();
      }, 3000);
    } catch (error) {
      console.error('Failed to show test notification:', error);
      alert('Failed to show test notification');
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon size={24} className="text-gray-600" />
        <h2 className="text-xl font-semibold text-gray-900">Chat Notification Settings</h2>
      </div>

      {/* Permission Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">Notification Permission</h3>
            <p className="text-sm text-gray-600">
              {permission === 'granted' && '✅ Notifications are enabled'}
              {permission === 'denied' && '❌ Notifications are blocked'}
              {permission === 'default' && '⏳ Notifications permission not set'}
            </p>
          </div>
          {permission !== 'granted' && (
            <button
              onClick={requestNotificationPermission}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Requesting...' : 'Enable Notifications'}
            </button>
          )}
        </div>
      </div>

      {/* Settings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.chatNotifications ? (
              <BellIcon size={20} className="text-green-600" />
            ) : (
              <BellOffIcon size={20} className="text-gray-400" />
            )}
            <div>
              <h3 className="font-medium text-gray-900">Chat Notifications</h3>
              <p className="text-sm text-gray-600">Receive notifications for new messages</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.chatNotifications}
              onChange={(e) => saveSettings({ chatNotifications: e.target.checked })}
              disabled={permission !== 'granted'}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">Sound</h3>
            <p className="text-sm text-gray-600">Play sound for notifications</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={(e) => saveSettings({ soundEnabled: e.target.checked })}
              disabled={!settings.chatNotifications || permission !== 'granted'}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">Vibration</h3>
            <p className="text-sm text-gray-600">Vibrate device for notifications</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.vibrationEnabled}
              onChange={(e) => saveSettings({ vibrationEnabled: e.target.checked })}
              disabled={!settings.chatNotifications || permission !== 'granted'}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">Message Preview</h3>
            <p className="text-sm text-gray-600">Show message content in notifications</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.showPreview}
              onChange={(e) => saveSettings({ showPreview: e.target.checked })}
              disabled={!settings.chatNotifications || permission !== 'granted'}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Test Button */}
      {permission === 'granted' && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={testNotification}
            className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            Test Notification
          </button>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">💡 Tips</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Notifications work best when the app is installed as a PWA</li>
          <li>• Make sure your browser allows notifications for this site</li>
          <li>• On mobile, notifications will appear in your notification center</li>
          <li>• You can tap notifications to quickly open the chat</li>
        </ul>
      </div>
    </div>
  );
};
