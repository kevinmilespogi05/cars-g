import { EnhancedChatService } from '../services/enhancedChatService';
import { ChatConversation, ChatMessage } from '../types';

// Mock the config module
jest.mock('../lib/config', () => ({
  config: {
    api: {
      baseUrl: 'http://localhost:3001'
    }
  }
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('EnhancedChatService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getConversations', () => {
    it('should fetch conversations with enhanced participant data', async () => {
      const mockConversations = [
        {
          id: '1',
          participant1_id: 'user1',
          participant2_id: 'user2',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          last_message_at: '2024-01-01T00:00:00Z',
          participants: [
            {
              id: 'user1',
              username: 'User1',
              avatar_url: 'avatar1.jpg',
              is_online: true
            },
            {
              id: 'user2',
              username: 'User2',
              avatar_url: 'avatar2.jpg',
              is_online: false
            }
          ],
          unread_count: 3
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversations
      });

      const result = await EnhancedChatService.getConversations('user1');
      
      expect(result).toEqual(mockConversations);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/chat/conversations/user1',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    it('should handle fetch errors with retry logic', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => []
        });

      const result = await EnhancedChatService.getConversations('user1');
      
      expect(result).toEqual([]);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      const mockMessage: ChatMessage = {
        id: 'msg1',
        conversation_id: 'conv1',
        sender_id: 'user1',
        content: 'Hello!',
        message_type: 'text',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMessage
      });

      const result = await EnhancedChatService.sendMessage('conv1', 'Hello!', 'text');
      
      expect(result.success).toBe(true);
      expect(result.message).toEqual(mockMessage);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/chat/messages',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            conversation_id: 'conv1',
            content: 'Hello!',
            message_type: 'text',
            metadata: {}
          })
        })
      );
    });

    it('should handle send message failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await EnhancedChatService.sendMessage('conv1', 'Hello!', 'text');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(result.retryable).toBe(true);
    });
  });

  describe('markConversationAsRead', () => {
    it('should mark conversation as read successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const result = await EnhancedChatService.markConversationAsRead('user1', 'conv1');
      
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/chat/conversations/conv1/read',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ user_id: 'user1' })
        })
      );
    });

    it('should handle mark as read failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Server error'));

      const result = await EnhancedChatService.markConversationAsRead('user1', 'conv1');
      
      expect(result).toBe(false);
    });
  });

  describe('getUnreadCount', () => {
    it('should get unread count successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 5 })
      });

      const result = await EnhancedChatService.getUnreadCount('user1', 'conv1');
      
      expect(result).toBe(5);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/chat/conversations/conv1/unread?user_id=user1',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    it('should return 0 on error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await EnhancedChatService.getUnreadCount('user1', 'conv1');
      
      expect(result).toBe(0);
    });
  });

  describe('searchConversations', () => {
    it('should search conversations successfully', async () => {
      const mockSearchResults = [
        {
          id: '1',
          participant1_id: 'user1',
          participant2_id: 'user2',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          last_message_at: '2024-01-01T00:00:00Z',
          participants: [
            {
              id: 'user2',
              username: 'John Doe',
              avatar_url: 'avatar2.jpg'
            }
          ]
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResults
      });

      const result = await EnhancedChatService.searchConversations('user1', 'John');
      
      expect(result).toEqual(mockSearchResults);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/chat/conversations/search?user_id=user1&q=John',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    it('should return empty array on error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Search error'));

      const result = await EnhancedChatService.searchConversations('user1', 'John');
      
      expect(result).toEqual([]);
    });
  });

  describe('healthCheck', () => {
    it('should return true when service is healthy', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'OK' })
      });

      const result = await EnhancedChatService.healthCheck();
      
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/health',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    it('should return false when service is unhealthy', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Service unavailable'));

      const result = await EnhancedChatService.healthCheck();
      
      expect(result).toBe(false);
    });
  });

  describe('updateConfig', () => {
    it('should update service configuration', () => {
      const newConfig = {
        retryAttempts: 5,
        retryDelay: 2000,
        timeout: 15000
      };

      EnhancedChatService.updateConfig(newConfig);
      
      // Configuration is private, so we test by checking if the method doesn't throw
      expect(() => EnhancedChatService.updateConfig(newConfig)).not.toThrow();
    });
  });
});
