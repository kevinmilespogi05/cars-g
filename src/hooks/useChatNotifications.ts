import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { ChatNotificationService } from '../services/chatNotificationService';
import { supabase } from '../lib/supabase';

export interface ChatNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link?: string;
  created_at: string;
}

export function useChatNotifications() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<ChatNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load initial notifications
  useEffect(() => {
    if (user?.id) {
      loadNotifications();
    }
  }, [user?.id]);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('chat_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as ChatNotification;
          if (newNotification.link?.includes('conversationId')) {
            setNotifications((prev) => [newNotification, ...prev]);
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedNotification = payload.new as ChatNotification;
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === updatedNotification.id ? updatedNotification : n
            )
          );
          if (updatedNotification.read) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id]);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const data = await ChatNotificationService.getRecentChatNotifications(
        user.id,
        20
      );
      setNotifications(data);
      
      const count = await ChatNotificationService.getUnreadChatCount(user.id);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading chat notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const markConversationAsRead = useCallback(async (conversationId: string) => {
    if (!user?.id) return;

    try {
      const success = await ChatNotificationService.markConversationAsRead(
        user.id,
        conversationId
      );

      if (success) {
        // Update local state
        setNotifications((prev) =>
          prev.map((n) =>
            n.link?.includes(`conversationId=${conversationId}`)
              ? { ...n, read: true }
              : n
          )
        );
        
        // Recalculate unread count
        const newCount = await ChatNotificationService.getUnreadChatCount(user.id);
        setUnreadCount(newCount);
      }
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  }, [user?.id]);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)
        .like('link', '%conversationId=%');

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [user?.id]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      const deletedNotification = notifications.find(n => n.id === notificationId);
      if (deletedNotification && !deletedNotification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      setNotifications((prev) =>
        prev.filter((n) => n.id !== notificationId)
      );
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markConversationAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: loadNotifications,
  };
}
