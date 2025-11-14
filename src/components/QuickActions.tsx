import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  User,
  LogOut
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { ChatWindow } from './ChatWindow';
import { PWAInstallButton } from './PWAInstallButton';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  color: string;
  bgColor: string;
  mobileOnly?: boolean;
}

interface QuickActionsProps {
  hideEmergencyActions?: boolean;
  variant?: 'default' | 'sidebar'; // Add layout variant
}

export function QuickActions({ hideEmergencyActions = false, variant = 'default' }: QuickActionsProps) {
  const navigate = useNavigate();
  const { user, isAdminLike, signOut } = useAuthStore();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isChatOpen, setIsChatOpen] = React.useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      navigate('/login');
    }
  };

  const getQuickActions = (): QuickAction[] => {
    if (isAdminLike(user?.role)) {
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
          id: 'report',
          title: 'Report Issue',
          description: 'Report a community problem',
          icon: Plus,
          path: '/reports/create',
          color: 'text-red-600',
          bgColor: 'bg-red-100'
        },
        {
          id: 'announcements',
          title: 'Announcements',
          description: 'Latest community announcements',
          icon: Bell,
          path: '/announcements',
          color: 'text-indigo-600',
          bgColor: 'bg-indigo-100',
          mobileOnly: true
        },
        {
          id: 'contacts',
          title: 'Contacts',
          description: 'Emergency contacts',
          icon: MapPin,
          path: '/emergency-contacts',
          color: 'text-teal-600',
          bgColor: 'bg-teal-100',
          mobileOnly: true
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


  const quickActions = getQuickActions();
  // For desktop view, filter out mobileOnly items
  // For sidebar (compact) variant, hide items that don't belong in the quick-actions sidebar
  const visibleQuickActions = variant === 'sidebar'
    ? quickActions.filter(a => !a.mobileOnly && a.id !== 'view-reports' && a.id !== 'leaderboard')
    : quickActions.filter(a => !a.mobileOnly);

  return (
    <>
      {/* Desktop/Tablet layout */}
      <div className="hidden sm:block">
        {variant === 'sidebar' ? (
          // Sidebar variant: Vertical list layout for narrow sidebars
          <div className="space-y-2">
            {visibleQuickActions.map((action, index) => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <Link
                  to={action.path}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 group bg-white hover:bg-gray-50"
                >
                  <div className={`h-10 w-10 ${action.bgColor} rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                    <action.icon className={`h-5 w-5 ${action.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm mb-0.5 truncate">
                      {action.title}
                    </h3>
                    <p className="text-xs text-gray-600 truncate">
                      {action.description}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          // Default variant: Grid layout for wider spaces
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleQuickActions.map((action, index) => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Link
                  to={action.path}
                  className="block p-6 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-200 group bg-white hover:bg-gray-50"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className={`h-14 w-14 ${action.bgColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm`}>
                      <action.icon className={`h-7 w-7 ${action.color}`} />
                    </div>
                    <h3 className="font-semibold text-gray-900 text-base mb-2">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {action.description}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Emergency Actions - only show in default variant */}
        {!isAdminLike(user?.role) && !hideEmergencyActions && variant === 'default' && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Emergency Actions</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/reports/create?priority=urgent"
                className="flex items-center justify-center px-4 py-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-all duration-200 group"
              >
                <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                <span className="text-sm font-medium text-red-700">Report Emergency</span>
              </Link>
              <Link
                to="/reports/create"
                className="flex items-center justify-center px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-all duration-200 group"
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
                
                {/* Support Chat (mobile only) */}
                {!isAdminLike(user?.role) && user?.role !== 'patrol' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2, delay: quickActions.length * 0.05 }}
                  >
                    <button
                      type="button"
                      className="flex items-center gap-3 pl-3 pr-3 py-2 rounded-full bg-white border border-gray-200 shadow-md hover:shadow-lg active:scale-95 transition-all"
                      onClick={() => { setIsChatOpen(true); setIsOpen(false); }}
                    >
                      <div className="h-9 w-9 bg-green-100 rounded-full flex items-center justify-center">
                        <MessageCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-900 whitespace-nowrap">Support Chat</span>
                    </button>
                  </motion.div>
                )}
                
                {/* PWA Install CTA (mobile) */}
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2, delay: (quickActions.length + 1) * 0.05 }}
                >
                  <div className="px-1">
                    <PWAInstallButton className="w-full justify-start" />
                  </div>
                </motion.div>
                {/* Emergency actions (mobile) */}
                {!isAdminLike(user?.role) && !hideEmergencyActions && (
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

                {/* Profile & Sign Out (mobile) */}
                {user && (
                  <div className="mt-1 pt-1 border-t border-gray-200">
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.2, delay: (quickActions.length + 1) * 0.05 }}
                    >
                      <Link
                        to="/profile"
                        className="flex items-center gap-3 pl-3 pr-3 py-2 rounded-full bg-white border border-gray-200 shadow-md hover:shadow-lg active:scale-95 transition-all"
                        onClick={() => setIsOpen(false)}
                      >
                        <div className="h-9 w-9 bg-purple-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-purple-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-900 whitespace-nowrap">Profile Settings</span>
                      </Link>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.2, delay: (quickActions.length + 2) * 0.05 }}
                      className="mt-1"
                    >
                      <button
                        type="button"
                        className="flex items-center gap-3 pl-3 pr-3 py-2 rounded-full bg-white border border-red-200 shadow-md hover:shadow-lg active:scale-95 transition-all w-full"
                        onClick={() => {
                          setIsOpen(false);
                          handleSignOut();
                        }}
                      >
                        <div className="h-9 w-9 bg-red-100 rounded-full flex items-center justify-center">
                          <LogOut className="h-5 w-5 text-red-600" />
                        </div>
                        <span className="text-sm font-medium text-red-700 whitespace-nowrap">Sign Out</span>
                      </button>
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

      {/* Chat Window for mobile access */}
      {isChatOpen && (
        <ChatWindow isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      )}

    </>
  );
}
