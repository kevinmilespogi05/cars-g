import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { AdminChatInterface } from '../components/AdminChatInterface';
import { Link } from 'react-router-dom';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { useSidebarContext } from '../contexts/SidebarContext';

export const AdminChat: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const { isCollapsed, sidebarWidth, collapsedWidth } = useSidebarContext();
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    if (user.role !== 'admin') {
      // Redirect non-admin users
      window.location.href = '/reports';
      return;
    }
  }, [isAuthenticated, user]);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please sign in</h1>
          <Link to="/login" className="text-blue-600 hover:text-blue-800">
            Go to login page
          </Link>
        </div>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don't have permission to access this page.</p>
          <Link to="/reports" className="text-blue-600 hover:text-blue-800">
            Go to reports page
          </Link>
        </div>
      </div>
    );
  }

  // Compute left offset so the admin page respects the global sidebar state
  const effectiveLeft = isDesktop ? (isCollapsed ? collapsedWidth : sidebarWidth) : 0;

  return (
    <div
      className="fixed top-0 right-0 bottom-0 bg-white flex flex-col transition-all duration-300"
      style={{ paddingTop: '80px', left: `${effectiveLeft}px` }}
    >
      {/* Header - Messenger Style */}
      <div className="bg-white border-b border-gray-200 flex-shrink-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                to="/admin"
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Back to Admin Dashboard"
              >
                <ArrowLeft className="h-5 w-5 text-gray-700" />
              </Link>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <MessageCircle className="h-6 w-6 text-blue-500" />
                Admin Chat
              </h1>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 hidden sm:inline">
                Manage conversations
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Chat Interface */}
      <div className="flex-1 overflow-hidden">
        <AdminChatInterface
          isOpen={true}
          onClose={() => {}} // No close functionality needed since it's embedded
        />
      </div>
    </div>
  );
};
