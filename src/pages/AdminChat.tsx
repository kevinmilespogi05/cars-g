import React, { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { AdminChatInterface } from '../components/AdminChatInterface';
import { Link } from 'react-router-dom';
import { ArrowLeft, MessageCircle } from 'lucide-react';

export const AdminChat: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                to="/admin"
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Admin Dashboard
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900 flex items-center">
                <MessageCircle className="h-6 w-6 mr-2 text-blue-600" />
                Admin Chat
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Chat Interface */}
      <div className="h-[calc(100vh-4rem)]">
        <AdminChatInterface
          isOpen={true}
          onClose={() => {}} // No close functionality needed since it's embedded
        />
      </div>
    </div>
  );
};
