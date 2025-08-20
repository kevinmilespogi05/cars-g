import { supabase } from '../lib/supabase';
import { config } from '../lib/config';

export interface ChatNotificationData {
  conversationId: string;
  senderId: string;
  senderName: string;
  messageContent: string;
  messageType: string;
}

export class ChatNotificationService {
  private static API_BASE_URL = config.api.baseUrl;

  /**
   * Send a push notification to a specific user
   */
  static async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data: Record<string, any> = {}
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/push/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          title,
          body,
          data,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.ok === true;
    } catch (error) {
      console.error('Failed to send push notification:', error);
      return false;
    }
  }

  /**
   * Send a chat notification to a specific user
   */
  static async sendChatNotification(
    recipientId: string,
    notificationData: ChatNotificationData
  ): Promise<boolean> {
    try {
      // Create notification in database
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: recipientId,
          title: `New message from ${notificationData.senderName}`,
          message: notificationData.messageContent.slice(0, 120),
          type: 'info',
          link: `/chat?conversationId=${notificationData.conversationId}`,
          read: false,
        });

      if (notifError) {
        console.error('Failed to create notification:', notifError);
        return false;
      }

      // Send push notification
      const success = await this.sendPushNotification(
        recipientId,
        `New message from ${notificationData.senderName}`,
        notificationData.messageContent.slice(0, 120),
        {
          link: `/chat?conversationId=${notificationData.conversationId}`,
          conversationId: notificationData.conversationId,
          senderId: notificationData.senderId,
          messageType: 'chat',
        }
      );

      return success;
    } catch (error) {
      console.error('Failed to send chat notification:', error);
      return false;
    }
  }

  /**
   * Mark a conversation as read for notifications
   */
  static async markConversationAsRead(
    userId: string,
    conversationId: string
  ): Promise<boolean> {
    try {
      // Mark all notifications for this conversation as read
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .like('link', `%conversationId=${conversationId}%`);

      if (error) {
        console.error('Failed to mark notifications as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to mark conversation as read:', error);
      return false;
    }
  }

  /**
   * Get unread chat notifications count for a user
   */
  static async getUnreadChatCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false)
        .like('link', '%conversationId=%');

      if (error) {
        console.error('Failed to get unread chat count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Failed to get unread chat count:', error);
      return 0;
    }
  }

  /**
   * Get recent chat notifications for a user
   */
  static async getRecentChatNotifications(
    userId: string,
    limit: number = 10
  ): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .like('link', '%conversationId=%')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to get recent chat notifications:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get recent chat notifications:', error);
      return [];
    }
  }
}
