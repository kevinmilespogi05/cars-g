import React, { useState, useEffect } from 'react';
import { Bell, Mail, Smartphone, CheckCircle, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Button } from './Button';

export interface NotificationPreference {
  id: string;
  type: 'email' | 'push' | 'in_app';
  category: 'report_status' | 'achievements' | 'comments' | 'messages' | 'system';
  enabled: boolean;
}

export interface NotificationPreferencesProps {
  className?: string;
  onClose?: () => void;
}

const defaultPreferences: NotificationPreference[] = [
  { id: '1', type: 'email', category: 'report_status', enabled: true },
  { id: '2', type: 'email', category: 'achievements', enabled: true },
  { id: '3', type: 'email', category: 'comments', enabled: false },
  { id: '4', type: 'email', category: 'messages', enabled: true },
  { id: '5', type: 'email', category: 'system', enabled: true },
  { id: '6', type: 'push', category: 'report_status', enabled: true },
  { id: '7', type: 'push', category: 'achievements', enabled: true },
  { id: '8', type: 'push', category: 'comments', enabled: false },
  { id: '9', type: 'push', category: 'messages', enabled: true },
  { id: '10', type: 'push', category: 'system', enabled: false },
  { id: '11', type: 'in_app', category: 'report_status', enabled: true },
  { id: '12', type: 'in_app', category: 'achievements', enabled: true },
  { id: '13', type: 'in_app', category: 'comments', enabled: true },
  { id: '14', type: 'in_app', category: 'messages', enabled: true },
  { id: '15', type: 'in_app', category: 'system', enabled: true },
];

const categoryLabels: Record<string, string> = {
  report_status: 'Report Status Updates',
  achievements: 'Achievements & Badges',
  comments: 'Comments & Replies',
  messages: 'Messages & Chat',
  system: 'System Notifications'
};

const typeLabels: Record<string, string> = {
  email: 'Email',
  push: 'Push Notifications',
  in_app: 'In-App'
};

const typeIcons: Record<string, React.ReactNode> = {
  email: <Mail className="h-4 w-4" />,
  push: <Smartphone className="h-4 w-4" />,
  in_app: <Bell className="h-4 w-4" />
};

export function NotificationPreferences({ className, onClose }: NotificationPreferencesProps) {
  const { user } = useAuthStore();
  const [preferences, setPreferences] = useState<NotificationPreference[]>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // Try to load from user preferences table
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Error loading preferences:', error);
      } else if (data) {
        // Merge with defaults
        const merged = defaultPreferences.map(defaultPref => {
          const saved = data.preferences?.find(
            (p: NotificationPreference) =>
              p.type === defaultPref.type && p.category === defaultPref.category
          );
          return saved || defaultPref;
        });
        setPreferences(merged);
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: user.id,
          preferences: preferences,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving preferences:', error);
      // Fallback: save to localStorage
      localStorage.setItem(`notification_prefs_${user.id}`, JSON.stringify(preferences));
    } finally {
      setSaving(false);
    }
  };

  const togglePreference = (id: string) => {
    setPreferences(prev =>
      prev.map(pref =>
        pref.id === id ? { ...pref, enabled: !pref.enabled } : pref
      )
    );
  };

  const toggleCategory = (category: string, enabled: boolean) => {
    setPreferences(prev =>
      prev.map(pref =>
        pref.category === category ? { ...pref, enabled } : pref
      )
    );
  };

  const toggleType = (type: string, enabled: boolean) => {
    setPreferences(prev =>
      prev.map(pref =>
        pref.type === type ? { ...pref, enabled } : pref
      )
    );
  };

  if (loading) {
    return (
      <div className={cn('p-6', className)}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const categories = Array.from(new Set(preferences.map(p => p.category)));

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Notification Preferences</h2>
          <p className="text-sm text-gray-500 mt-1">Manage how you receive notifications</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto">
        {/* Quick Actions */}
        <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg">
          <span className="text-sm font-medium text-gray-700">Quick Actions:</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPreferences(prev => prev.map(p => ({ ...p, enabled: true })));
            }}
          >
            Enable All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPreferences(prev => prev.map(p => ({ ...p, enabled: false })));
            }}
          >
            Disable All
          </Button>
        </div>

        {/* Preferences by Category */}
        {categories.map(category => {
          const categoryPrefs = preferences.filter(p => p.category === category);
          const allEnabled = categoryPrefs.every(p => p.enabled);
          const someEnabled = categoryPrefs.some(p => p.enabled);

          return (
            <div key={category} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">
                  {categoryLabels[category]}
                </h3>
                <button
                  onClick={() => toggleCategory(category, !allEnabled)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {allEnabled ? 'Disable All' : 'Enable All'}
                </button>
              </div>

              <div className="space-y-3">
                {['email', 'push', 'in_app'].map(type => {
                  const pref = categoryPrefs.find(p => p.type === type);
                  if (!pref) return null;

                  return (
                    <div
                      key={`${category}-${type}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'p-2 rounded-lg',
                          pref.enabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                        )}>
                          {typeIcons[type]}
                        </div>
                        <div>
                          <div className="font-medium text-sm text-gray-900">
                            {typeLabels[type]}
                          </div>
                          <div className="text-xs text-gray-500">
                            {pref.enabled ? 'Enabled' : 'Disabled'}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => togglePreference(pref.id)}
                        className={cn(
                          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                          pref.enabled ? 'bg-blue-600' : 'bg-gray-300'
                        )}
                        role="switch"
                        aria-checked={pref.enabled}
                        aria-label={`Toggle ${typeLabels[type]} for ${categoryLabels[category]}`}
                      >
                        <span
                          className={cn(
                            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                            pref.enabled ? 'translate-x-6' : 'translate-x-1'
                          )}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          {saved && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle className="h-4 w-4" />
              <span>Preferences saved</span>
            </div>
          )}
        </div>
        <Button
          onClick={savePreferences}
          disabled={saving}
          loading={saving}
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
}

