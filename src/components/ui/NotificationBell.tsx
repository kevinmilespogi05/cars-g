import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, CheckCheck, FileText, Shield, CheckCircle, AlertCircle, MessageSquare, Megaphone, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useNotifications } from '../../lib/notifications';
import { useAuthStore } from '../../store/authStore';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export interface NotificationBellProps {
  className?: string;
  showDropdown?: boolean;
}

export function NotificationBell({ className, showDropdown = true }: NotificationBellProps) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [shouldPulse, setShouldPulse] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const previousUnreadCountRef = useRef(0);

  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications(user?.id || '');

  // Detect new notifications and trigger animations
  useEffect(() => {
    if (unreadCount > previousUnreadCountRef.current && previousUnreadCountRef.current > 0) {
      // New notification arrived
      setHasNewNotification(true);
      setShouldPulse(true);
      
      // Trigger shake for urgent notifications
      const latestNotification = notifications[0];
      if (latestNotification && (latestNotification.type === 'error' || latestNotification.type === 'warning')) {
        setShouldShake(true);
        setTimeout(() => setShouldShake(false), 300);
      }
      
      // Reset pulse after animation
      setTimeout(() => setShouldPulse(false), 1000);
      setTimeout(() => setHasNewNotification(false), 2000);
    }
    previousUnreadCountRef.current = unreadCount;
  }, [unreadCount, notifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  if (!user) return null;

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    setIsOpen(false);
    
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-amber-600" />;
      case 'chat':
        return <MessageSquare className="h-4 w-4 text-blue-600" />;
      case 'info':
      default:
        return <FileText className="h-4 w-4 text-blue-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      case 'chat':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  // Limit notifications to 5 for dropdown
  const displayNotifications = notifications.slice(0, 5);

  return (
    <div className={cn('relative', className)}>
      <motion.button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative flex items-center justify-center',
          'w-12 h-12 rounded-full transition-all duration-200',
          'bg-white shadow-lg hover:shadow-xl',
          'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          'text-gray-700 hover:text-gray-900 border border-gray-200',
          isOpen && 'bg-gray-50 ring-2 ring-blue-500 ring-offset-2'
        )}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        animate={{
          scale: shouldPulse ? [1, 1.2, 1] : 1,
          rotate: shouldShake ? [-5, 5, -5, 0] : 0,
        }}
        transition={{
          scale: { duration: 0.5, repeat: shouldPulse ? 2 : 0 },
          rotate: { duration: 0.3 },
        }}
      >
        <Bell className="h-5 w-5" />
        
        {/* Badge Counter */}
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={cn(
              'absolute -top-1 -right-1 flex items-center justify-center',
              'min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold text-white',
              'bg-[#ef4444] border-2 border-white shadow-sm',
              unreadCount > 99 && 'text-[9px] px-1'
            )}
            aria-label={`${unreadCount} unread notifications`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {showDropdown && isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            ref={dropdownRef}
            className={cn(
              'absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-80 md:w-96 bg-white rounded-lg shadow-2xl',
              'border border-gray-200 z-[3000] max-h-[500px] overflow-hidden flex flex-col',
              'backdrop-blur-sm'
            )}
            role="menu"
            aria-label="Notifications"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-gray-700" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-[#ef4444] text-white text-xs font-bold rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={async () => {
                      await markAllAsRead();
                    }}
                    className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                    aria-label="Mark all as read"
                    title="Mark all as read"
                  >
                    <CheckCheck className="h-4 w-4 text-gray-600" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                  aria-label="Close notifications"
                >
                  <X className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Loading notifications...</p>
                </div>
              ) : displayNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-900 mb-1">All caught up!</p>
                  <p className="text-xs text-gray-500">No new notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {displayNotifications.map((notification, index) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        'p-4 transition-colors cursor-pointer group',
                        !notification.read && 'bg-blue-50/50',
                        'hover:bg-gray-50'
                      )}
                      onClick={() => handleNotificationClick(notification)}
                      role="menuitem"
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={cn(
                          'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border',
                          getNotificationColor(notification.type)
                        )}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className={cn(
                              'text-sm font-semibold leading-tight',
                              !notification.read ? 'text-gray-900' : 'text-gray-700'
                            )}>
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-1.5" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <time
                              className="text-xs text-gray-400"
                              dateTime={notification.created_at}
                            >
                              {formatDistanceToNow(new Date(notification.created_at), {
                                addSuffix: true
                              })}
                            </time>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!notification.read && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    await markAsRead(notification.id);
                                  }}
                                  className="p-1 rounded hover:bg-gray-200 transition-colors"
                                  aria-label="Mark as read"
                                  title="Mark as read"
                                >
                                  <Check className="h-3 w-3 text-gray-500" />
                                </button>
                              )}
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await deleteNotification(notification.id);
                                }}
                                className="p-1 rounded hover:bg-gray-200 transition-colors"
                                aria-label="Delete notification"
                                title="Delete"
                              >
                                <X className="h-3 w-3 text-gray-500" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 bg-gray-50">
                <Link
                  to="/notifications"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  <span>View all notifications</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
