import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  Users, 
  BarChart3, 
  Settings, 
  LayoutDashboard,
  FileText,
  Megaphone,
  Check,
  Clock,
  Info,
  ClipboardList,
  Shield
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserManagement } from '../components/UserManagement';
import { AdminStatistics } from '../components/AdminStatistics';
import { AdminSettings } from '../components/AdminSettings';
import { Notification } from '../components/Notification';
import { AdminReports } from '../components/AdminReports';
import { AnnouncementManagement } from '../components/AnnouncementManagement';
import { AdminCaseRequests } from '../components/AdminCaseRequests';
import { AdminDutySchedule } from '../components/AdminDutySchedule';

export function AdminDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState<'reports' | 'requests' | 'duty' | 'users' | 'stats' | 'settings' | 'announcements'>('reports');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showInfo, setShowInfo] = useState<boolean>(false);
  const [totalReports, setTotalReports] = useState<number>(0);
  const [requestReports, setRequestReports] = useState<number>(0);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [activePatrols, setActivePatrols] = useState<number>(0);

  useEffect(() => {
    // Optional: protect route
  }, [user, navigate]);

  // Function to count active patrols based on current time
  const countActivePatrols = (dutySchedules: any[]) => {
    const now = new Date();
    const currentDate = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const currentHour = now.getHours();
    
    // Determine current shift: AM (6-17) or PM (18-5)
    const currentShift = currentHour >= 6 && currentHour < 18 ? 'AM' : 'PM';
    
    // Count patrols for today's current shift
    const todayPatrols = dutySchedules.filter(schedule => 
      schedule.duty_date === currentDate && 
      schedule.shift === currentShift &&
      (schedule.dispatcher_user_id || schedule.receiver_user_id)
    );
    
    return todayPatrols.length;
  };

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [reportsAll, reportsVerifying, usersAll, dutySchedules] = await Promise.all([
          supabase.from('reports').select('*', { count: 'exact', head: true }),
          supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'verifying'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('duty_schedules').select('*').gte('duty_date', new Date().toISOString().slice(0, 10))
        ]);

        setTotalReports(reportsAll.count || 0);
        setRequestReports(reportsVerifying.count || 0);
        setTotalUsers(usersAll.count || 0);
        setActivePatrols(countActivePatrols(dutySchedules.data || []));
      } catch (e) {
        console.error('Failed to fetch admin dashboard counts', e);
      }
    };
    fetchCounts();
  }, []);

  const TabButton = ({
    icon: Icon,
    label,
    value
  }: {
    icon: any;
    label: string;
    value: 'reports' | 'requests' | 'duty' | 'users' | 'stats' | 'settings' | 'announcements';
  }) => (
    <button
      onClick={() => setActiveSection(value)}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
        activeSection === value
          ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
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
      <div className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 supports-[backdrop-filter]:bg-white/70 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <div>
                <nav aria-label="Breadcrumb" className="text-xs text-gray-500">
                  <ol className="flex items-center space-x-1">
                    <li>Admin</li>
                    <li className="text-gray-300">/</li>
                    <li className="font-medium text-gray-700">Dashboard</li>
                  </ol>
                </nav>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Admin • Dashboard</h1>
                <p className="text-sm text-gray-600">Manage reports, users, stats, announcements, and settings</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg bg-white hover:bg-gray-50"
                aria-pressed={showInfo}
                title="Toggle info drawer"
              >
                <Info className="w-4 h-4" />
                Info
              </button>
            </div>
          </div>

          {/* Quick stat tiles */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-lg bg-blue-600/10 text-blue-700 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="ml-3">
                  <p className="text-xs text-gray-600">Total Reports</p>
                  <p className="text-xl font-semibold text-gray-900">{totalReports}</p>
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div className="ml-3">
                  <p className="text-xs text-gray-600">Requests</p>
                  <p className="text-xl font-semibold text-gray-900">{requestReports}</p>
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-lg bg-green-600/10 text-green-600 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="ml-3">
                  <p className="text-xs text-gray-600">On Duty</p>
                  <p className="text-xl font-semibold text-gray-900">{activePatrols}</p>
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-lg bg-purple-600/10 text-purple-600 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div className="ml-3">
                  <p className="text-xs text-gray-600">Total Users</p>
                  <p className="text-xl font-semibold text-gray-900">{totalUsers}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Top tabs */}
          <div className="mt-4 flex items-center gap-2 overflow-x-auto">
            <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
              <TabButton icon={FileText} label="Reports" value="reports" />
              <TabButton icon={ClipboardList} label="Requests" value="requests" />
              <TabButton icon={ClipboardList} label="Duty" value="duty" />
              <TabButton icon={Users} label="Users" value="users" />
              <TabButton icon={BarChart3} label="Statistics" value="stats" />
              <TabButton icon={Megaphone} label="Announcements" value="announcements" />
              <TabButton icon={Settings} label="Settings" value="settings" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 py-4">
          {activeSection === 'reports' && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 md:p-4">
              <AdminReports />
            </div>
          )}
          {activeSection === 'requests' && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 md:p-4">
              <AdminCaseRequests />
            </div>
          )}
          {activeSection === 'duty' && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 md:p-4">
              <AdminDutySchedule />
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
          {activeSection === 'announcements' && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 md:p-4">
              <AnnouncementManagement />
            </div>
          )}
          {activeSection === 'settings' && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 md:p-4">
              <AdminSettings />
            </div>
          )}
        </div>
      </main>

      {/* Right-side Info Drawer */}
      {showInfo && (
        <aside className="fixed right-0 top-[64px] bottom-0 w-80 max-w-[85vw] bg-white border-l border-gray-200 shadow-xl z-40 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Section Info</h3>
            <button onClick={() => setShowInfo(false)} className="px-2 py-1 text-sm rounded-md border border-gray-200 hover:bg-gray-50">Close</button>
          </div>
          {activeSection === 'reports' && (
            <div>
              <p className="text-sm text-gray-700 mb-2">Manage all citizen reports here.</p>
              <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                <li>Filter, review, and update report statuses.</li>
                <li>Assign to patrol officers and view details.</li>
                <li>Export and audit recent activity.</li>
              </ul>
            </div>
          )}
          {activeSection === 'requests' && (
            <div>
              <p className="text-sm text-gray-700 mb-2">Review newly created case requests.</p>
              <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                <li>Verify request details and evidence.</li>
                <li>Accept to move to pending queue, or reject with reason.</li>
                <li>Assign priority and group after acceptance.</li>
              </ul>
            </div>
          )}
          {activeSection === 'duty' && (
            <div>
              <p className="text-sm text-gray-700 mb-2">Manage daily AM/PM duty schedules.</p>
              <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                <li>Set dispatcher and receiver per shift.</li>
                <li>Track notes and coverage across dates.</li>
              </ul>
            </div>
          )}
          {activeSection === 'users' && (
            <div>
              <p className="text-sm text-gray-700 mb-2">User management overview.</p>
              <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                <li>View profiles and roles.</li>
                <li>Promote, deactivate, or reset credentials.</li>
                <li>Audit login and activity if available.</li>
              </ul>
            </div>
          )}
          {activeSection === 'stats' && (
            <div>
              <p className="text-sm text-gray-700 mb-2">City insights and trends.</p>
              <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                <li>Track report volumes and categories.</li>
                <li>Identify hotspots and response times.</li>
                <li>Download charts for presentations.</li>
              </ul>
            </div>
          )}
          {activeSection === 'announcements' && (
            <div>
              <p className="text-sm text-gray-700 mb-2">Broadcast updates to the community.</p>
              <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                <li>Create scheduled announcements.</li>
                <li>Attach images and categorize messages.</li>
                <li>Review engagement metrics.</li>
              </ul>
            </div>
          )}
          {activeSection === 'settings' && (
            <div>
              <p className="text-sm text-gray-700 mb-2">Configure platform preferences.</p>
              <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                <li>Security and access settings.</li>
                <li>Notification rules and integrations.</li>
                <li>Branding and appearance.</li>
              </ul>
            </div>
          )}
        </aside>
      )}

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