import { supabase } from './supabase';
import { useEffect, useState, useCallback } from 'react';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'chat';
  read: boolean;
  created_at: string;
  link?: string;
}

export interface NotificationFilters {
  type?: Notification['type'];
  read?: boolean;
  search?: string;
}

export interface UseNotificationsOptions {
  limit?: number;
  filters?: NotificationFilters;
  autoFetch?: boolean;
}

export function useNotifications(
  userId: string,
  options: UseNotificationsOptions = {}
) {
  const { limit = 50, filters, autoFetch = true } = options;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);

  const fetchNotifications = useCallback(async (pageNum: number = 0, reset: boolean = false) => {
    if (!userId) return;
    
    try {
      setLoading(true);
      let query = supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      // Apply filters
      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      if (filters?.read !== undefined) {
        query = query.eq('read', filters.read);
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,message.ilike.%${filters.search}%`);
      }

      // Order and paginate
      query = query
        .order('created_at', { ascending: false })
        .range(pageNum * limit, (pageNum + 1) * limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      if (reset) {
        setNotifications(data || []);
      } else {
        setNotifications((prev) => [...prev, ...(data || [])]);
      }

      setHasMore((count || 0) > (pageNum + 1) * limit);
      setUnreadCount((prev) => {
        if (reset) {
          return data?.filter((n) => !n.read).length || 0;
        }
        return prev;
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, limit, filters]);

  useEffect(() => {
    if (autoFetch && userId) {
      fetchNotifications(0, true);
      setPage(0);
    }
  }, [userId, autoFetch, fetchNotifications]);

  useEffect(() => {
    if (!userId) return;

    // Subscribe to new notifications
    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          // Only add if it matches current filters
          const matchesFilter = 
            (!filters?.type || newNotification.type === filters.type) &&
            (filters?.read === undefined || newNotification.read === filters.read) &&
            (!filters?.search || 
              newNotification.title.toLowerCase().includes(filters.search.toLowerCase()) ||
              newNotification.message.toLowerCase().includes(filters.search.toLowerCase())
            );
          
          if (matchesFilter) {
            setNotifications((prev) => [newNotification, ...prev]);
          }
          setUnreadCount((prev) => prev + 1);
          
          // Play notification sound if enabled
          playNotificationSound(newNotification.type);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, filters]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      fetchNotifications(nextPage, false);
      setPage(nextPage);
    }
  }, [loading, hasMore, page, fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.filter((n) => n.id !== notificationId)
      );
      
      // Update unread count if the deleted notification was unread
      const deletedNotification = notifications.find(n => n.id === notificationId);
      if (deletedNotification && !deletedNotification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const deleteAllRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)
        .eq('read', true);

      if (error) throw error;

      setNotifications((prev) => prev.filter((n) => !n.read));
    } catch (error) {
      console.error('Error deleting all read notifications:', error);
    }
  };

  const refresh = useCallback(() => {
    setPage(0);
    fetchNotifications(0, true);
  }, [fetchNotifications]);

  // Group notifications by date
  const groupedNotifications = notifications.reduce((groups, notification) => {
    const date = new Date(notification.created_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let key: string;
    if (date.toDateString() === today.toDateString()) {
      key = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      key = 'Yesterday';
    } else {
      key = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(notification);
    return groups;
  }, {} as Record<string, Notification[]>);

  return {
    notifications,
    groupedNotifications,
    unreadCount,
    loading,
    hasMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    refresh,
    loadMore,
  };
}

// Check if current time is within quiet hours
function isQuietHours(): boolean {
  try {
    const quietHoursEnabled = localStorage.getItem('notification_quiet_hours_enabled') === 'true';
    if (!quietHoursEnabled) return false;

    const start = localStorage.getItem('notification_quiet_hours_start') || '22:00';
    const end = localStorage.getItem('notification_quiet_hours_end') || '08:00';

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    const [currentHour, currentMin] = currentTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const currentMinutes = currentHour * 60 + currentMin;

    // Handle quiet hours that span midnight
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    } else {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }
  } catch (error) {
    console.debug('Error checking quiet hours:', error);
    return false;
  }
}

// Play notification sound based on type
function playNotificationSound(type: Notification['type']) {
  try {
    // Check if sounds are enabled in preferences
    const soundEnabled = localStorage.getItem('notification_sound_enabled') !== 'false';
    if (!soundEnabled) return;

    // Check if we're in quiet hours
    if (isQuietHours()) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Different frequencies for different notification types
    const frequencies: Record<Notification['type'], number> = {
      success: 523.25, // C5
      error: 392.00,   // G4
      warning: 440.00, // A4
      info: 493.88,    // B4
      chat: 659.25,    // E5
    };

    const frequency = frequencies[type] || frequencies.info;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    // Silently fail if audio context is not available
    console.debug('Could not play notification sound:', error);
  }
}

// Helper function to create a notification
export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: Notification['type'] = 'info',
  link?: string
) {
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type,
      link,
      read: false,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error creating notification:', error);
    return false;
  }
}

// Helper function to get notification count by type
export async function getNotificationCounts(userId: string) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('type, read')
      .eq('user_id', userId);

    if (error) throw error;

    const counts = {
      total: data.length,
      unread: data.filter((n) => !n.read).length,
      byType: {} as Record<Notification['type'], { total: number; unread: number }>,
    };

    data.forEach((notification) => {
      if (!counts.byType[notification.type as Notification['type']]) {
        counts.byType[notification.type as Notification['type']] = { total: 0, unread: 0 };
      }
      counts.byType[notification.type as Notification['type']].total++;
      if (!notification.read) {
        counts.byType[notification.type as Notification['type']].unread++;
      }
    });

    return counts;
  } catch (error) {
    console.error('Error getting notification counts:', error);
    return null;
  }
}

// Create a notification for report status changes
export async function notifyReportStatusChange(
  userId: string,
  reportId: string,
  reportTitle: string,
  newStatus: 'pending' | 'in_progress' | 'resolved' | 'declined'
) {
  let title = '';
  let message = '';
  let type: Notification['type'] = 'info';
  
  switch (newStatus) {
    case 'in_progress':
      title = 'Report Verified';
      message = `Your report "${reportTitle}" has been verified and is now being addressed.`;
      type = 'success';
      break;
    case 'resolved':
      title = 'Report Resolved';
      message = `Your report "${reportTitle}" has been resolved. Thank you for helping improve our community!`;
      type = 'success';
      break;
    case 'declined':
      title = 'Report Declined';
      message = `Your report "${reportTitle}" could not be processed at this time.`;
      type = 'warning';
      break;
    default:
      title = 'Report Status Updated';
      message = `The status of your report "${reportTitle}" has been updated.`;
      type = 'info';
  }
  
  return createNotification(
    userId,
    title,
    message,
    type,
    `/reports/${reportId}`
  );
} 