import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  BarChart3, 
  LayoutDashboard,
  Megaphone,
  Check,
  Clock,
  Info
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserManagement } from '../components/UserManagement';
import { AdminStatistics } from '../components/AdminStatistics';
import { Notification } from '../components/Notification';
import { AdminReports } from '../components/AdminReports';
import { AnnouncementManagement } from '../components/AnnouncementManagement';
import { AdminCaseRequests } from '../components/AdminCaseRequests';
import { AdminDutySchedule } from '../components/AdminDutySchedule';
import { AdminVerificationDashboard } from '../components/AdminVerificationDashboard';

export function AdminDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Get active section from URL query params, default to 'reports'
  const activeSection = (searchParams.get('section') || 'reports') as 'reports' | 'requests' | 'duty' | 'users' | 'stats' | 'settings' | 'announcements' | 'verification';
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showInfo, setShowInfo] = useState<boolean>(false);

  useEffect(() => {
    // Optional: protect route
  }, [user, navigate]);


  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Page header */}
      <div className="relative z-10 border-b border-gray-200 bg-white/80 supports-[backdrop-filter]:bg-white/70 backdrop-blur">
        <div className="w-full px-4 py-4">
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
                <p className="text-sm text-gray-600">Manage reports, users, stats, and announcements</p>
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

        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="relative w-full px-4 py-4">
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
          {activeSection === 'verification' && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 md:p-4">
              <AdminVerificationDashboard />
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
        </div>
      </main>

      {/* Right-side Info Drawer */}
      {showInfo && (
        <aside className="fixed right-0 top-20 sm:top-24 bottom-0 w-80 max-w-[85vw] bg-white border-l border-gray-200 shadow-xl z-[2200] p-4 overflow-y-auto">
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
              <p className="text-sm text-gray-700 mb-2 font-semibold">Duty Schedule Management:</p>
              <ol className="list-decimal pl-5 text-sm text-gray-600 space-y-2 mb-3">
                <li>View all patrol officers available for duty assignments.</li>
                <li>Assign officers to AM (morning) or PM (afternoon/evening) shifts.</li>
                <li>Set dispatcher (responsible for report assignments) and receiver (handles completed reports) per shift.</li>
                <li>Track coverage: Ensure all shifts have assigned officers.</li>
                <li>Add notes: Document special instructions, coverage gaps, or shift changes.</li>
              </ol>
              <p className="text-xs text-gray-500 mt-2">
                <strong>Note:</strong> Duty schedules help organize patrol coverage and ensure proper report handling throughout the day.
              </p>
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
          {activeSection === 'verification' && (
            <div>
              <p className="text-sm text-gray-700 mb-2 font-semibold">ID Verification Process:</p>
              <ol className="list-decimal pl-5 text-sm text-gray-600 space-y-2 mb-3">
                <li>Users submit ID documents (front and back) for verification.</li>
                <li>AI automatically analyzes submissions and provides confidence scores.</li>
                <li>Review pending requests: Check ID images, AI analysis, and user details.</li>
                <li>Make decision: Approve (user gains full access) or Decline (request declined).</li>
                <li>Add admin notes (optional) to document your decision reasoning.</li>
              </ol>
              <p className="text-xs text-gray-500 mt-2">
                <strong>Tip:</strong> High AI confidence (80%+) usually indicates valid IDs. Lower scores may need manual review.
              </p>
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