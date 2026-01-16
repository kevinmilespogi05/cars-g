import React, { useState, useEffect } from 'react';
import { Bell, Search, Filter, CheckCircle, AlertCircle, MessageSquare, FileText, X, CheckCheck, Trash2, Settings, Clock } from 'lucide-react';
import { useNotifications, NotificationFilters } from '../lib/notifications';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { NotificationPreferences } from '../components/ui/NotificationPreferences';

export function Notifications() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string | undefined>(undefined);
  const [filterRead, setFilterRead] = useState<boolean | undefined>(undefined);
  const [showPreferences, setShowPreferences] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());

  const filters: NotificationFilters = {
    search: searchQuery || undefined,
    type: filterType as any,
    read: filterRead,
  };

  const {
    notifications,
    groupedNotifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    loadMore,
    hasMore,
    refresh,
  } = useNotifications(user?.id || '', { limit: 20, filters });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-amber-600" />;
      case 'chat':
        return <MessageSquare className="h-5 w-5 text-blue-600" />;
      case 'info':
      default:
        return <FileText className="h-5 w-5 text-blue-600" />;
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

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleBulkAction = async (action: 'read' | 'delete') => {
    if (selectedNotifications.size === 0) return;

    const promises = Array.from(selectedNotifications).map((id) => {
      if (action === 'read') {
        return markAsRead(id);
      } else {
        return deleteNotification(id);
      }
    });

    await Promise.all(promises);
    setSelectedNotifications(new Set());
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedNotifications);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedNotifications(newSelected);
  };

  const selectAll = () => {
    if (selectedNotifications.size === notifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(notifications.map((n) => n.id)));
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Please log in to view notifications</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Bell className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPreferences(true)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Notification preferences"
                >
                  <Settings className="h-5 w-5 text-gray-600" />
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={async () => {
                      await markAllAsRead();
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <CheckCheck className="h-4 w-4" />
                    Mark all as read
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="p-6 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filter:</span>
              </div>
              
              <button
                onClick={() => setFilterType(undefined)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                  !filterType
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                All Types
              </button>
              
              {['info', 'success', 'warning', 'error', 'chat'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(filterType === type ? undefined : type)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors capitalize",
                    filterType === type
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  )}
                >
                  {type}
                </button>
              ))}

              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => setFilterRead(filterRead === false ? undefined : false)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                    filterRead === false
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  )}
                >
                  Unread Only
                </button>
                <button
                  onClick={() => setFilterRead(filterRead === true ? undefined : true)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                    filterRead === true
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  )}
                >
                  Read Only
                </button>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedNotifications.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200"
              >
                <span className="text-sm font-medium text-blue-900">
                  {selectedNotifications.size} selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleBulkAction('read')}
                    className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Mark as read
                  </button>
                  <button
                    onClick={() => handleBulkAction('delete')}
                    className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                  <button
                    onClick={() => setSelectedNotifications(new Set())}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {loading && notifications.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-500">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery || filterType || filterRead !== undefined
                  ? 'No matching notifications'
                  : 'All caught up!'}
              </p>
              <p className="text-sm text-gray-500 mb-4">
                {searchQuery || filterType || filterRead !== undefined
                  ? 'Try adjusting your filters'
                  : 'You have no notifications at this time'}
              </p>
              {(searchQuery || filterType || filterRead !== undefined) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterType(undefined);
                    setFilterRead(undefined);
                  }}
                  className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Select All */}
              <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <button
                  onClick={selectAll}
                  className="text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  {selectedNotifications.size === notifications.length ? 'Deselect all' : 'Select all'}
                </button>
                {notifications.some((n) => n.read) && (
                  <button
                    onClick={async () => {
                      if (confirm('Delete all read notifications?')) {
                        await deleteAllRead();
                      }
                    }}
                    className="text-sm font-medium text-red-600 hover:text-red-700 flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete all read
                  </button>
                )}
              </div>

              {/* Grouped Notifications */}
              {Object.entries(groupedNotifications || {}).map(([dateGroup, groupNotifications]) => (
                <div key={dateGroup} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <h3 className="text-sm font-semibold text-gray-700">{dateGroup}</h3>
                      <span className="text-xs text-gray-500">
                        ({groupNotifications.length})
                      </span>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {groupNotifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                          'p-4 transition-colors cursor-pointer group hover:bg-gray-50',
                          !notification.read && 'bg-blue-50/30',
                          selectedNotifications.has(notification.id) && 'bg-blue-100'
                        )}
                        onClick={() => {
                          if (selectedNotifications.size > 0) {
                            toggleSelect(notification.id);
                          } else {
                            handleNotificationClick(notification);
                          }
                        }}
                      >
                        <div className="flex items-start gap-4">
                          {/* Checkbox for selection */}
                          {selectedNotifications.size > 0 && (
                            <input
                              type="checkbox"
                              checked={selectedNotifications.has(notification.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleSelect(notification.id);
                              }}
                              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          )}

                          {/* Icon */}
                          <div
                            className={cn(
                              'flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center border-2',
                              getNotificationColor(notification.type)
                            )}
                          >
                            {getNotificationIcon(notification.type)}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4
                                className={cn(
                                  'text-base font-semibold leading-tight',
                                  !notification.read ? 'text-gray-900' : 'text-gray-700'
                                )}
                              >
                                {notification.title}
                              </h4>
                              {!notification.read && (
                                <div className="flex-shrink-0 w-2.5 h-2.5 bg-blue-600 rounded-full mt-2" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between">
                              <time
                                className="text-xs text-gray-400 flex items-center gap-1"
                                dateTime={notification.created_at}
                              >
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(new Date(notification.created_at), {
                                  addSuffix: true,
                                })}
                              </time>
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!notification.read && (
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await markAsRead(notification.id);
                                    }}
                                    className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                                    title="Mark as read"
                                  >
                                    <CheckCircle className="h-4 w-4 text-gray-500" />
                                  </button>
                                )}
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    await deleteNotification(notification.id);
                                  }}
                                  className="p-1.5 rounded hover:bg-red-100 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4 text-gray-500" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Load More */}
              {hasMore && (
                <div className="text-center py-6">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="px-6 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Loading...' : 'Load more notifications'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Preferences Modal */}
      <AnimatePresence>
        {showPreferences && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowPreferences(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            >
              <NotificationPreferences onClose={() => setShowPreferences(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
