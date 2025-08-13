import { ChatConversation, ChatMessage } from '../types';
import { config } from '../lib/config';

const API_BASE_URL = config.api.baseUrl;

export class ChatService {
  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Get all conversations for a user
  static async getConversations(userId: string): Promise<ChatConversation[]> {
    return this.request<ChatConversation[]>(`/api/chat/conversations/${userId}`);
  }

  // Get messages for a specific conversation
  static async getMessages(conversationId: string): Promise<ChatMessage[]> {
    return this.request<ChatMessage[]>(`/api/chat/messages/${conversationId}`);
  }

  // Create a new conversation
  static async createConversation(
    participant1Id: string,
    participant2Id: string
  ): Promise<ChatConversation> {
    return this.request<ChatConversation>('/api/chat/conversations', {
      method: 'POST',
      body: JSON.stringify({
        participant1_id: participant1Id,
        participant2_id: participant2Id,
      }),
    });
  }

  // Get or create conversation between two users
  static async getOrCreateConversation(
    participant1Id: string,
    participant2Id: string
  ): Promise<ChatConversation> {
    try {
      // First try to get existing conversations
      const conversations = await this.getConversations(participant1Id);
      const existingConversation = conversations.find(
        (conv) =>
          (conv.participant1_id === participant1Id &&
            conv.participant2_id === participant2Id) ||
          (conv.participant1_id === participant2Id &&
            conv.participant2_id === participant1Id)
      );

      if (existingConversation) {
        return existingConversation;
      }

      // Create new conversation if none exists
      return await this.createConversation(participant1Id, participant2Id);
    } catch (error) {
      console.error('Error getting or creating conversation:', error);
      throw error;
    }
  }

  // Mark conversation as read
  static async markConversationAsRead(
    userId: string,
    conversationId: string
  ): Promise<void> {
    // This would typically call a Supabase function
    // For now, we'll handle this through the WebSocket connection
    console.log(`Marking conversation ${conversationId} as read for user ${userId}`);
  }

  // Get unread message count for a user
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const conversations = await this.getConversations(userId);
      let totalUnread = 0;

      for (const conversation of conversations) {
        if (conversation.unread_count) {
          totalUnread += conversation.unread_count;
        }
      }

      return totalUnread;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }
} 