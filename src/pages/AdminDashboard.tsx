import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  Users, 
  BarChart3, 
  Settings, 
  LayoutDashboard,
  FileText
} from 'lucide-react';
import { UserManagement } from '../components/UserManagement';
import { AdminStatistics } from '../components/AdminStatistics';
import { AdminSettings } from '../components/AdminSettings';
import { Notification } from '../components/Notification';
import { AdminReports } from '../components/AdminReports';

export function AdminDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState<'reports' | 'users' | 'stats' | 'settings'>('reports');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    // Optional: protect route
  }, [user, navigate]);

  const TabButton = ({
    icon: Icon,
    label,
    value
  }: {
    icon: any;
    label: string;
    value: 'reports' | 'users' | 'stats' | 'settings';
  }) => (
    <button
      onClick={() => setActiveSection(value)}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors border ${
        activeSection === value
          ? 'bg-blue-50 border-blue-200 text-blue-700'
          : 'bg-white border-transparent text-gray-700 hover:bg-gray-50'
      }`}
      title={label}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-blue-600" />
              <h1 className="text-lg font-bold text-gray-900">Admin Dashboard</h1>
            </div>
          </div>

          {/* Top tabs */}
          <div className="mt-4 flex items-center gap-2">
            <TabButton icon={FileText} label="Reports" value="reports" />
            <TabButton icon={Users} label="Users" value="users" />
            <TabButton icon={BarChart3} label="Statistics" value="stats" />
            <TabButton icon={Settings} label="Settings" value="settings" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 py-4">
          {activeSection === 'reports' && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 md:p-4">
              <AdminReports />
          </div>
        )}
          {activeSection === 'users' && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 md:p-4">
              <UserManagement />
                  </div>
                )}
          {activeSection === 'stats' && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 md:p-4">
              <AdminStatistics />
            </div>
          )}
          {activeSection === 'settings' && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 md:p-4">
              <AdminSettings />
            </div>
          )}
        </div>
      </main>

      {/* Notification */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
} 