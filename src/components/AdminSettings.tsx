import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Loader2, RefreshCw, Save, AlertTriangle } from 'lucide-react';
import { Notification } from './Notification';

interface Setting {
  id: string;
  key: string;
  value: any;
  created_at: string;
  updated_at: string;
}

interface NotificationState {
  message: string;
  type: 'success' | 'error' | 'warning';
  show: boolean;
}

export function AdminSettings() {
  const { user: currentUser } = useAuthStore();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<NotificationState>({
    message: '',
    type: 'success',
    show: false
  });

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchSettings();
    }
  }, [currentUser?.role]);

  const showNotification = (message: string, type: NotificationState['type']) => {
    setNotification({ message, type, show: true });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .order('key');

      if (error) throw error;

      setSettings(data || []);
    } catch (error) {
      console.error('Error fetching settings:', error);
      showNotification('Failed to fetch settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update each setting
      for (const setting of settings) {
        const { error } = await supabase
          .from('settings')
          .update({ 
            value: setting.value,
            updated_at: new Date().toISOString()
          })
          .eq('id', setting.id);

        if (error) throw error;
      }

      showNotification('Settings saved successfully', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      showNotification('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (id: string, newValue: any) => {
    setSettings(prev => 
      prev.map(setting => 
        setting.id === id 
          ? { ...setting, value: newValue }
          : setting
      )
    );
  };

  if (currentUser?.role !== 'admin') {
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Mobile Header */}
      <div className="sm:hidden">
        <h3 className="text-lg font-medium text-gray-900 mb-3">System Settings</h3>
        <div className="space-y-2">
          <button
            onClick={fetchSettings}
            disabled={loading}
            className="w-full inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden sm:flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">System Settings</h3>
        <div className="flex space-x-2">
          <button
            onClick={fetchSettings}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-3 py-4 sm:px-6 sm:py-5">
          {settings.map((setting) => (
            <div key={setting.id} className="mb-6 last:mb-0">
              <h4 className="text-sm font-medium text-gray-900 capitalize">
                {setting.key.replace('_', ' ')}
              </h4>
              <div className="mt-2">
                {setting.key === 'report_settings' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Minimum Points
                      </label>
                      <input
                        type="number"
                        value={setting.value.min_points}
                        onChange={(e) => updateSetting(setting.id, {
                          ...setting.value,
                          min_points: parseInt(e.target.value)
                        })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Maximum Points
                      </label>
                      <input
                        type="number"
                        value={setting.value.max_points}
                        onChange={(e) => updateSetting(setting.id, {
                          ...setting.value,
                          max_points: parseInt(e.target.value)
                        })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  </div>
                )}

                {setting.key === 'notification_settings' && (
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={setting.value.email_notifications}
                        onChange={(e) => updateSetting(setting.id, {
                          ...setting.value,
                          email_notifications: e.target.checked
                        })}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label className="ml-2 block text-sm text-gray-900">
                        Email Notifications
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={setting.value.push_notifications}
                        onChange={(e) => updateSetting(setting.id, {
                          ...setting.value,
                          push_notifications: e.target.checked
                        })}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label className="ml-2 block text-sm text-gray-900">
                        Push Notifications
                      </label>
                    </div>
                  </div>
                )}

                {setting.key === 'system_settings' && (
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={setting.value.maintenance_mode}
                        onChange={(e) => updateSetting(setting.id, {
                          ...setting.value,
                          maintenance_mode: e.target.checked
                        })}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label className="ml-2 block text-sm text-gray-900">
                        Maintenance Mode
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={setting.value.allow_new_registrations}
                        onChange={(e) => updateSetting(setting.id, {
                          ...setting.value,
                          allow_new_registrations: e.target.checked
                        })}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label className="ml-2 block text-sm text-gray-900">
                        Allow New Registrations
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {notification.show && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(prev => ({ ...prev, show: false }))}
        />
      )}
    </div>
  );
} 