import { ChatConversation, ChatMessage } from '../types';
import { config } from '../lib/config';

const API_BASE_URL = config.api.baseUrl;

export interface ChatServiceConfig {
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
}

export interface MessageSendResult {
  success: boolean;
  message?: ChatMessage;
  error?: string;
  retryable?: boolean;
}

export interface ConversationWithParticipants extends ChatConversation {
  participants: Array<{
    id: string;
    username: string;
    avatar_url: string | null;
    is_online?: boolean;
    last_seen?: string;
  }>;
  unread_count: number;
}

export class EnhancedChatService {
  private static config: ChatServiceConfig = {
    retryAttempts: 3,
    retryDelay: 1000,
    timeout: 10000
  };

  private static async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        
        // Retry on server errors (5xx) or rate limiting (429)
        if ((response.status >= 500 || response.status === 429) && retryCount < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * Math.pow(2, retryCount));
          return this.request<T>(endpoint, options, retryCount + 1);
        }
        
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      // Retry on network errors
      if (retryCount < this.config.retryAttempts && this.isRetryableError(error)) {
        await this.delay(this.config.retryDelay * Math.pow(2, retryCount));
        return this.request<T>(endpoint, options, retryCount + 1);
      }
      
      throw error;
    }
  }

  private static isRetryableError(error: any): boolean {
    if (error instanceof Error) {
      return error.message.includes('timeout') || 
             error.message.includes('network') ||
             error.message.includes('fetch');
    }
    return false;
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get conversations with enhanced participant data
  static async getConversations(userId: string): Promise<ConversationWithParticipants[]> {
    try {
      // The backend already provides participants and unread_count, so we can use it directly
      const conversations = await this.request<ConversationWithParticipants[]>(`/api/chat/conversations/${userId}`);
      return conversations;
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  }

  // Get conversation participants
  static async getConversationParticipants(conversationId: string): Promise<Array<{
    id: string;
    username: string;
    avatar_url: string | null;
    is_online?: boolean;
    last_seen?: string;
  }>> {
    try {
      return await this.request<Array<{
        id: string;
        username: string;
        avatar_url: string | null;
        is_online?: boolean;
        last_seen?: string;
      }>>(`/api/chat/conversations/${conversationId}/participants`);
    } catch (error) {
      console.error('Error fetching participants:', error);
      return [];
    }
  }

  // Get messages with pagination
  static async getMessages(
    conversationId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<ChatMessage[]> {
    try {
      return await this.request<ChatMessage[]>(
        `/api/chat/messages/${conversationId}?limit=${limit}&offset=${offset}`
      );
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw new Error('Failed to load messages');
    }
  }

  // Create conversation with enhanced validation
  static async createConversation(
    participant1Id: string,
    participant2Id: string
  ): Promise<ChatConversation> {
    if (participant1Id === participant2Id) {
      throw new Error('Cannot create conversation with yourself');
    }

    try {
      return await this.request<ChatConversation>('/api/chat/conversations', {
        method: 'POST',
        body: JSON.stringify({
          participant1_id: participant1Id,
          participant2_id: participant2Id,
        }),
      });
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw new Error('Failed to create conversation');
    }
  }

  // Get or create conversation with better error handling
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

  // Send message with enhanced error handling
  static async sendMessage(
    conversationId: string,
    content: string,
    senderId: string,
    messageType: string = 'text',
    metadata?: Record<string, any>
  ): Promise<MessageSendResult> {
    try {
      const message = await this.request<ChatMessage>('/api/chat/messages', {
        method: 'POST',
        body: JSON.stringify({
          conversation_id: conversationId,
          content,
          sender_id: senderId,
          message_type: messageType,
          metadata: metadata || {}
        }),
      });

      return {
        success: true,
        message
      };
    } catch (error) {
      console.error('Error sending message:', error);
      
      const isRetryable = error instanceof Error && 
        (error.message.includes('timeout') || 
         error.message.includes('network') ||
         error.message.includes('fetch'));

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send message',
        retryable: isRetryable
      };
    }
  }

  // Mark conversation as read
  static async markConversationAsRead(
    userId: string,
    conversationId: string
  ): Promise<boolean> {
    try {
      await this.request(`/api/chat/conversations/${conversationId}/read`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      });
      return true;
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      return false;
    }
  }

  // Get unread count for a specific conversation
  static async getUnreadCount(userId: string, conversationId: string): Promise<number> {
    try {
      const result = await this.request<{ count: number }>(
        `/api/chat/conversations/${conversationId}/unread?user_id=${userId}`
      );
      return result.count;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Get total unread count for user
  static async getTotalUnreadCount(userId: string): Promise<number> {
    try {
      const result = await this.request<{ count: number }>(
        `/api/chat/unread-count?user_id=${userId}`
      );
      return result.count;
    } catch (error) {
      console.error('Error getting total unread count:', error);
      return 0;
    }
  }

  // Delete message with enhanced validation
  static async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    try {
      const result = await this.request<{ success: boolean }>(`/api/chat/messages/${messageId}`, {
        method: 'DELETE',
        body: JSON.stringify({ userId })
      });
      return result.success;
    } catch (error) {
      console.error('Error deleting message:', error);
      return false;
    }
  }

  // Search conversations
  static async searchConversations(
    userId: string, 
    query: string
  ): Promise<ConversationWithParticipants[]> {
    try {
      return await this.request<ConversationWithParticipants[]>(
        `/api/chat/conversations/search?user_id=${userId}&q=${encodeURIComponent(query)}`
      );
    } catch (error) {
      console.error('Error searching conversations:', error);
      return [];
    }
  }

  // Get conversation by ID
  static async getConversation(conversationId: string): Promise<ConversationWithParticipants | null> {
    try {
      return await this.request<ConversationWithParticipants>(`/api/chat/conversations/details/${conversationId}`);
    } catch (error) {
      console.error('Error fetching conversation:', error);
      return null;
    }
  }

  // Update service configuration
  static updateConfig(newConfig: Partial<ChatServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Health check
  static async healthCheck(): Promise<boolean> {
    try {
      await this.request('/health');
      return true;
    } catch (error) {
      console.error('Chat service health check failed:', error);
      return false;
    }
  }
}
