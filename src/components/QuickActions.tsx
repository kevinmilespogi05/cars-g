import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Plus, 
  FileText, 
  Award, 
  MapPin, 
  Bell,
  Camera,
  AlertTriangle,
  MessageCircle,
  X
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { ChatWindow } from './ChatWindow';
import { socketManager } from '../lib/socket';
import { checkAdminStatus } from '../services/adminService';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  color: string;
  bgColor: string;
}

interface QuickActionsProps {
  hideEmergencyActions?: boolean;
}

export function QuickActions({ hideEmergencyActions = false }: QuickActionsProps) {
  const { user, isAuthenticated } = useAuthStore();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAdminOnline, setIsAdminOnline] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const getQuickActions = (): QuickAction[] => {
    if (user?.role === 'admin') {
      return [
        {
          id: 'map',
          title: 'Map View',
          description: 'Monitor community areas',
          icon: MapPin,
          path: '/admin/map',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100'
        },
        {
          id: 'leaderboard',
          title: 'Leaderboard',
          description: 'View community stats',
          icon: Award,
          path: '/leaderboard',
          color: 'text-orange-600',
          bgColor: 'bg-orange-100'
        }
      ];
    } else if (user?.role === 'patrol') {
      return [
        // Patrol users don't need quick actions since they're already on their dashboard
      ];
    } else {
      return [
        {
          id: 'create-report',
          title: 'Report Issue',
          description: 'Report a community problem',
          icon: Plus,
          path: '/reports/create',
          color: 'text-red-600',
          bgColor: 'bg-red-100'
        },
        {
          id: 'view-reports',
          title: 'My Reports',
          description: 'Track your reports',
          icon: FileText,
          path: '/profile',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100'
        },
        {
          id: 'leaderboard',
          title: 'Leaderboard',
          description: 'See community rankings',
          icon: Award,
          path: '/leaderboard',
          color: 'text-orange-600',
          bgColor: 'bg-orange-100'
        }
      ];
    }
  };

  // Chat functionality
  useEffect(() => {
    if (!isAuthenticated || !user || user.role === 'admin') return;

    // Check initial admin status
    const checkInitialAdminStatus = async () => {
      const adminStatus = await checkAdminStatus();
      if (adminStatus.success) {
        setIsAdminOnline(adminStatus.isOnline);
      }
    };

    checkInitialAdminStatus();

    // Set up admin online status listener
    const handleAdminOnline = (data: { isOnline: boolean }) => {
      setIsAdminOnline(data.isOnline);
    };

    // Set up message received listener for unread count
    const handleMessageReceived = (message: any) => {
      if (message.sender_id !== user.id) {
        setUnreadCount(prev => prev + 1);
      }
    };

    // Set up messages read listener
    const handleMessagesRead = (data: { messageIds: string[] }) => {
      setUnreadCount(0);
    };

    socketManager.onAdminOnline(handleAdminOnline);
    socketManager.onMessageReceived(handleMessageReceived);
    socketManager.onMessagesRead(handleMessagesRead);

    return () => {
      socketManager.offAdminOnline(handleAdminOnline);
      socketManager.offMessageReceived(handleMessageReceived);
      socketManager.offMessagesRead(handleMessagesRead);
    };
  }, [isAuthenticated, user]);

  const handleChatClick = () => {
    setIsChatOpen(true);
    setUnreadCount(0); // Clear unread count when opening chat
    setIsOpen(false); // Close the quick actions menu
  };

  const handleChatClose = () => {
    setIsChatOpen(false);
  };

  const quickActions = getQuickActions();

  return (
    <>
      {/* Desktop/Tablet layout */}
      <div className="hidden sm:block bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          <p className="text-sm text-gray-600">Access your most common tasks</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Link
                to={action.path}
                className="block p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 group"
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`h-12 w-12 ${action.bgColor} rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <action.icon className={`h-6 w-6 ${action.color}`} />
                  </div>
                  <h3 className="font-medium text-gray-900 text-sm mb-1">
                    {action.title}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {action.description}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Emergency Actions */}
        {user?.role !== 'admin' && !hideEmergencyActions && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Emergency Actions</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/reports/create?priority=urgent"
                className="flex items-center justify-center px-4 py-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors group"
              >
                <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                <span className="text-sm font-medium text-red-700">Report Emergency</span>
              </Link>
              <Link
                to="/reports/create"
                className="flex items-center justify-center px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors group"
              >
                <Camera className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-blue-700">Report with Photo</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Floating Bubble */}
      <div className="sm:hidden">
        <div className="fixed bottom-5 left-5 z-50">
          {/* Expanded actions list */}
          <div className="flex flex-col items-start mb-3">
            {isOpen && (
              <div className="flex flex-col items-stretch gap-2 mb-2">
                {quickActions.map((action, index) => (
                  <motion.div
                    key={action.id}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                  >
                    <Link
                      to={action.path}
                      className="flex items-center gap-3 pl-3 pr-3 py-2 rounded-full bg-white border border-gray-200 shadow-md hover:shadow-lg active:scale-95 transition-all"
                      onClick={() => setIsOpen(false)}
                    >
                      <div className={`h-9 w-9 ${action.bgColor} rounded-full flex items-center justify-center`}>
                        <action.icon className={`h-5 w-5 ${action.color}`} />
                      </div>
                      <span className="text-sm font-medium text-gray-900 whitespace-nowrap">{action.title}</span>
                    </Link>
                  </motion.div>
                ))}
                
                {/* Chat option (mobile) - only for non-admin users */}
                {user?.role !== 'admin' && isAuthenticated && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2, delay: quickActions.length * 0.05 }}
                  >
                    <button
                      onClick={handleChatClick}
                      className="flex items-center gap-3 pl-3 pr-3 py-2 rounded-full bg-white border border-gray-200 shadow-md hover:shadow-lg active:scale-95 transition-all relative"
                    >
                      <div className="h-9 w-9 bg-blue-100 rounded-full flex items-center justify-center relative">
                        <MessageCircle className="h-5 w-5 text-blue-600" />
                        {/* Unread count badge */}
                        {unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </div>
                        )}
                        {/* Online indicator */}
                        {isAdminOnline && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                        )}
                      </div>
                      <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
                        Chat with Admin
                        {isAdminOnline && <span className="text-green-600 ml-1">•</span>}
                      </span>
                    </button>
                  </motion.div>
                )}
                
                {/* Emergency actions (mobile) */}
                {user?.role !== 'admin' && !hideEmergencyActions && (
                  <div className="mt-1 pt-1 border-t border-gray-200">
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.2, delay: quickActions.length * 0.05 }}
                    >
                      <Link
                        to="/reports/create?priority=urgent"
                        className="flex items-center gap-3 pl-3 pr-3 py-2 rounded-full bg-white border border-red-200 shadow-md hover:shadow-lg active:scale-95 transition-all"
                        onClick={() => setIsOpen(false)}
                      >
                        <div className="h-9 w-9 bg-red-100 rounded-full flex items-center justify-center">
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        </div>
                        <span className="text-sm font-medium text-red-700 whitespace-nowrap">Report Emergency</span>
                      </Link>
                    </motion.div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bubble button */}
          <button
            aria-label={isOpen ? 'Close quick actions' : 'Open quick actions'}
            onClick={() => setIsOpen(prev => !prev)}
            className="h-14 w-14 rounded-full shadow-lg bg-primary-color text-white flex items-center justify-center active:scale-95 transition-transform"
          >
            <motion.div
              key={isOpen ? 'close' : 'open'}
              initial={{ rotate: 0, scale: 0.9, opacity: 0.8 }}
              animate={{ rotate: isOpen ? 45 : 0, scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center"
            >
              <Plus className="h-7 w-7" />
            </motion.div>
          </button>
        </div>
      </div>

      {/* Chat Window */}
      {user?.role !== 'admin' && isAuthenticated && (
        <ChatWindow
          isOpen={isChatOpen}
          onClose={handleChatClose}
          adminId="admin"
        />
      )}
    </>
  );
}
