import { ChatService } from '../services/chatService';
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

describe('ChatService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getConversations', () => {
    it('should fetch conversations successfully', async () => {
      const mockConversations: ChatConversation[] = [
        {
          id: '1',
          participant1_id: 'user1',
          participant2_id: 'user2',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          last_message_at: '2024-01-01T00:00:00Z'
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversations
      });

      const result = await ChatService.getConversations('user1');
      
      expect(result).toEqual(mockConversations);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/chat/conversations/user1',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    it('should handle fetch errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      await expect(ChatService.getConversations('user1')).rejects.toThrow('HTTP error! status: 500');
    });
  });

  describe('getMessages', () => {
    it('should fetch messages successfully', async () => {
      const mockMessages: ChatMessage[] = [
        {
          id: '1',
          conversation_id: 'conv1',
          sender_id: 'user1',
          content: 'Hello!',
          message_type: 'text',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMessages
      });

      const result = await ChatService.getMessages('conv1');
      
      expect(result).toEqual(mockMessages);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/chat/messages/conv1',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });
  });

  describe('createConversation', () => {
    it('should create conversation successfully', async () => {
      const mockConversation: ChatConversation = {
        id: '1',
        participant1_id: 'user1',
        participant2_id: 'user2',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        last_message_at: '2024-01-01T00:00:00Z'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversation
      });

      const result = await ChatService.createConversation('user1', 'user2');
      
      expect(result).toEqual(mockConversation);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/chat/conversations',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            participant1_id: 'user1',
            participant2_id: 'user2'
          }),
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });
  });

  describe('getOrCreateConversation', () => {
    it('should return existing conversation if found', async () => {
      const mockConversations: ChatConversation[] = [
        {
          id: '1',
          participant1_id: 'user1',
          participant2_id: 'user2',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          last_message_at: '2024-01-01T00:00:00Z'
        }
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockConversations
        });

      const result = await ChatService.getOrCreateConversation('user1', 'user2');
      
      expect(result).toEqual(mockConversations[0]);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should create new conversation if none exists', async () => {
      const mockConversations: ChatConversation[] = [];
      const mockNewConversation: ChatConversation = {
        id: '2',
        participant1_id: 'user1',
        participant2_id: 'user3',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        last_message_at: '2024-01-01T00:00:00Z'
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockConversations
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockNewConversation
        });

      const result = await ChatService.getOrCreateConversation('user1', 'user3');
      
      expect(result).toEqual(mockNewConversation);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
}); 