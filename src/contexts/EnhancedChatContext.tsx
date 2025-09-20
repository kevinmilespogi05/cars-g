import React, { createContext, useContext, useReducer, useCallback, useEffect, ReactNode } from 'react';
import { ChatConversation, ChatMessage } from '../types';
import { EnhancedChatService, ConversationWithParticipants } from '../services/enhancedChatService';
import { useEnhancedChatSocket } from '../hooks/useEnhancedChatSocket';
import { useAuthStore } from '../store/authStore';

interface ChatState {
  conversations: ConversationWithParticipants[];
  selectedConversation: ConversationWithParticipants | null;
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  typingUsers: Set<string>;
  unreadCount: number;
  connectionStatus: {
    isConnected: boolean;
    isAuthenticated: boolean;
    connectionQuality: 'excellent' | 'good' | 'poor';
  };
  searchQuery: string;
  filteredConversations: ConversationWithParticipants[];
}

type ChatAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CONVERSATIONS'; payload: ConversationWithParticipants[] }
  | { type: 'ADD_CONVERSATION'; payload: ConversationWithParticipants }
  | { type: 'UPDATE_CONVERSATION'; payload: ConversationWithParticipants }
  | { type: 'SELECT_CONVERSATION'; payload: ConversationWithParticipants | null }
  | { type: 'SET_MESSAGES'; payload: ChatMessage[] }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'UPDATE_MESSAGE'; payload: ChatMessage }
  | { type: 'REMOVE_MESSAGE'; payload: string }
  | { type: 'SET_TYPING_USERS'; payload: Set<string> }
  | { type: 'ADD_TYPING_USER'; payload: string }
  | { type: 'REMOVE_TYPING_USER'; payload: string }
  | { type: 'SET_UNREAD_COUNT'; payload: number }
  | { type: 'UPDATE_CONNECTION_STATUS'; payload: Partial<ChatState['connectionStatus']> }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'CLEAR_ERROR' };

const initialState: ChatState = {
  conversations: [],
  selectedConversation: null,
  messages: [],
  loading: false,
  error: null,
  typingUsers: new Set(),
  unreadCount: 0,
  connectionStatus: {
    isConnected: false,
    isAuthenticated: false,
    connectionQuality: 'good',
  },
  searchQuery: '',
  filteredConversations: [],
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    case 'SET_CONVERSATIONS':
      return { 
        ...state, 
        conversations: action.payload,
        filteredConversations: state.searchQuery 
          ? action.payload.filter(conv => 
              conv.participants.some(p => 
                p.username.toLowerCase().includes(state.searchQuery.toLowerCase())
              )
            )
          : action.payload
      };
    
    case 'ADD_CONVERSATION':
      const newConversations = [action.payload, ...state.conversations];
      return {
        ...state,
        conversations: newConversations,
        filteredConversations: state.searchQuery 
          ? newConversations.filter(conv => 
              conv.participants.some(p => 
                p.username.toLowerCase().includes(state.searchQuery.toLowerCase())
              )
            )
          : newConversations
      };
    
    case 'UPDATE_CONVERSATION':
      const updatedConversations = state.conversations.map(conv =>
        conv.id === action.payload.id ? action.payload : conv
      );
      return {
        ...state,
        conversations: updatedConversations,
        filteredConversations: state.searchQuery 
          ? updatedConversations.filter(conv => 
              conv.participants.some(p => 
                p.username.toLowerCase().includes(state.searchQuery.toLowerCase())
              )
            )
          : updatedConversations,
        selectedConversation: state.selectedConversation?.id === action.payload.id 
          ? action.payload 
          : state.selectedConversation
      };
    
    case 'SELECT_CONVERSATION':
      return { ...state, selectedConversation: action.payload };
    
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    
    case 'ADD_MESSAGE':
      // Validate message payload
      if (!action.payload || !action.payload.id || !action.payload.content) {
        console.error('Invalid message payload:', action.payload);
        return state;
      }

      // Check if message already exists to prevent duplicates
      const messageExists = state.messages.some(msg => msg.id === action.payload.id);
      if (messageExists) {
        return state;
      }
      
      // Check if this is a real message replacing an optimistic one
      const optimisticMessageIndex = state.messages.findIndex(msg => 
        msg.id.startsWith('temp-') && 
        msg.conversation_id === action.payload.conversation_id &&
        msg.sender_id === action.payload.sender_id &&
        msg.content === action.payload.content &&
        Math.abs(new Date(msg.created_at).getTime() - new Date(action.payload.created_at).getTime()) < 5000 // Within 5 seconds
      );
      
      if (optimisticMessageIndex !== -1) {
        // Replace optimistic message with real one
        const updatedMessages = [...state.messages];
        updatedMessages[optimisticMessageIndex] = action.payload;
        return { ...state, messages: updatedMessages };
      }
      
      // Add new message with validation
      const newMessages = [...state.messages, action.payload];
      
      // Keep only last 1000 messages to prevent memory issues
      if (newMessages.length > 1000) {
        newMessages.splice(0, newMessages.length - 1000);
      }
      
      return { ...state, messages: newMessages };
    
    case 'UPDATE_MESSAGE':
      const updatedMessages = state.messages.map(msg =>
        msg.id === action.payload.id ? action.payload : msg
      );
      return { ...state, messages: updatedMessages };
    
    case 'REMOVE_MESSAGE':
      const filteredMessages = state.messages.filter(msg => msg.id !== action.payload);
      return { ...state, messages: filteredMessages };
    
    case 'SET_TYPING_USERS':
      return { ...state, typingUsers: action.payload };
    
    case 'ADD_TYPING_USER':
      const newTypingUsers = new Set(state.typingUsers);
      newTypingUsers.add(action.payload);
      return { ...state, typingUsers: newTypingUsers };
    
    case 'REMOVE_TYPING_USER':
      const updatedTypingUsers = new Set(state.typingUsers);
      updatedTypingUsers.delete(action.payload);
      return { ...state, typingUsers: updatedTypingUsers };
    
    case 'SET_UNREAD_COUNT':
      return { ...state, unreadCount: action.payload };
    
    case 'UPDATE_CONNECTION_STATUS':
      return {
        ...state,
        connectionStatus: { ...state.connectionStatus, ...action.payload }
      };
    
    case 'SET_SEARCH_QUERY':
      const query = action.payload.toLowerCase();
      return {
        ...state,
        searchQuery: action.payload,
        filteredConversations: query
          ? state.conversations.filter(conv => 
              conv.participants.some(p => 
                p.username.toLowerCase().includes(query)
              )
            )
          : state.conversations
      };
    
    default:
      return state;
  }
}

interface ChatContextType {
  state: ChatState;
  actions: {
    loadConversations: () => Promise<void>;
    loadMessages: (conversationId: string) => Promise<void>;
    selectConversation: (conversation: ConversationWithParticipants | null) => void;
    sendMessage: (content: string, messageType?: string) => Promise<boolean>;
    deleteMessage: (messageId: string) => Promise<boolean>;
    markAsRead: (conversationId: string) => Promise<void>;
    createConversation: (participantId: string) => Promise<ConversationWithParticipants | null>;
    searchConversations: (query: string) => void;
    clearSearch: () => void;
    retryConnection: () => void;
    clearError: () => void;
  };
  socket: {
    isConnected: boolean;
    isAuthenticated: boolean;
    connectionQuality: 'excellent' | 'good' | 'poor';
    sendMessage: (conversationId: string, content: string, messageType?: string) => Promise<boolean>;
    joinConversation: (conversationId: string) => void;
    leaveConversation: (conversationId: string) => void;
    startTyping: (conversationId: string) => void;
    stopTyping: (conversationId: string) => void;
  };
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
}

export const EnhancedChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { user } = useAuthStore();

  // WebSocket connection
  const socket = useEnhancedChatSocket({
    userId: user?.id || '',
    onMessage: useCallback((message: ChatMessage) => {
      // Validate message structure
      if (!message || !message.id || !message.conversation_id || !message.content) {
        console.error('Invalid message received:', message);
        return;
      }

      // Only add message if it's for the current conversation
      if (state.selectedConversation && message.conversation_id === state.selectedConversation.id) {
        dispatch({ type: 'ADD_MESSAGE', payload: message });
      }
      
      // Update conversation with new message in the conversations list
      const conversation = state.conversations.find(c => c.id === message.conversation_id);
      if (conversation) {
        dispatch({
          type: 'UPDATE_CONVERSATION',
          payload: {
            ...conversation,
            last_message: message,
            last_message_at: message.created_at,
            unread_count: conversation.id === state.selectedConversation?.id 
              ? 0 
              : conversation.unread_count + 1
          }
        });
      }
    }, [state.selectedConversation, state.conversations]),
    
    onTyping: useCallback((userId: string, username: string) => {
      dispatch({ type: 'ADD_TYPING_USER', payload: username });
    }, []),
    
    onTypingStop: useCallback((userId: string) => {
      dispatch({ type: 'REMOVE_TYPING_USER', payload: userId });
    }, []),
    
    onAuthenticated: useCallback((user: any) => {
      dispatch({ type: 'UPDATE_CONNECTION_STATUS', payload: { isAuthenticated: true } });
    }, []),
    
    onAuthError: useCallback((error: any) => {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Authentication failed' });
    }, []),
    
    onConnectionChange: useCallback((connected: boolean) => {
      dispatch({ type: 'UPDATE_CONNECTION_STATUS', payload: { isConnected: connected } });
    }, []),
    
    onError: useCallback((error: string) => {
      dispatch({ type: 'SET_ERROR', payload: error });
    }, []),
  });

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!user?.id) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      
      const conversations = await EnhancedChatService.getConversations(user.id);
      dispatch({ type: 'SET_CONVERSATIONS', payload: conversations });
      
      // Calculate total unread count
      const totalUnread = conversations.reduce((sum, conv) => sum + conv.unread_count, 0);
      dispatch({ type: 'SET_UNREAD_COUNT', payload: totalUnread });
    } catch (error) {
      console.error('Error loading conversations:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to load conversations' 
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [user?.id]);

  // Load messages for a conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      
      const messages = await EnhancedChatService.getMessages(conversationId);
      dispatch({ type: 'SET_MESSAGES', payload: messages });
    } catch (error) {
      console.error('Error loading messages:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to load messages' 
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Select conversation
  const selectConversation = useCallback((conversation: ConversationWithParticipants | null) => {
    dispatch({ type: 'SELECT_CONVERSATION', payload: conversation });
    
    if (conversation) {
      // Join conversation room
      socket.joinConversation(conversation.id);
      
      // Load messages
      loadMessages(conversation.id);
      
      // Mark as read
      markAsRead(conversation.id);
    } else {
      // Leave current conversation
      if (state.selectedConversation) {
        socket.leaveConversation(state.selectedConversation.id);
      }
      dispatch({ type: 'SET_MESSAGES', payload: [] });
    }
  }, [socket, loadMessages, state.selectedConversation]);

  // Send message
  const sendMessage = useCallback(async (content: string, messageType: string = 'text'): Promise<boolean> => {
    if (!state.selectedConversation || !user?.id) return false;

    try {
      // Create optimistic message
      const optimisticMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: state.selectedConversation.id,
        sender_id: user.id,
        content,
        message_type: messageType as any,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sender: {
          id: user.id,
          username: user.username || 'You',
          avatar_url: user.avatar_url
        }
      };

      // Add optimistic message
      dispatch({ type: 'ADD_MESSAGE', payload: optimisticMessage });

      // Send via WebSocket
      const success = await socket.sendMessage(state.selectedConversation.id, content, messageType);
      
      if (!success) {
        // Remove optimistic message on failure
        dispatch({ type: 'REMOVE_MESSAGE', payload: optimisticMessage.id });
        dispatch({ type: 'SET_ERROR', payload: 'Failed to send message' });
      }

      return success;
    } catch (error) {
      console.error('Error sending message:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to send message' });
      return false;
    }
  }, [state.selectedConversation, user, socket]);

  // Delete message
  const deleteMessage = useCallback(async (messageId: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const success = await EnhancedChatService.deleteMessage(messageId, user.id);
      
      if (success) {
        dispatch({ type: 'REMOVE_MESSAGE', payload: messageId });
      }
      
      return success;
    } catch (error) {
      console.error('Error deleting message:', error);
      return false;
    }
  }, [user?.id]);

  // Mark conversation as read
  const markAsRead = useCallback(async (conversationId: string) => {
    if (!user?.id) return;

    try {
      await EnhancedChatService.markConversationAsRead(user.id, conversationId);
      
      // Update local state
      dispatch({
        type: 'UPDATE_CONVERSATION',
        payload: {
          ...state.conversations.find(c => c.id === conversationId)!,
          unread_count: 0
        }
      });
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  }, [user?.id, state.conversations]);

  // Create conversation
  const createConversation = useCallback(async (participantId: string): Promise<ConversationWithParticipants | null> => {
    if (!user?.id) return null;

    try {
      const conversation = await EnhancedChatService.getOrCreateConversation(user.id, participantId);
      
      // Load full conversation data
      const fullConversation = await EnhancedChatService.getConversation(conversation.id);
      if (fullConversation) {
        dispatch({ type: 'ADD_CONVERSATION', payload: fullConversation });
        return fullConversation;
      }
      
      return null;
    } catch (error) {
      console.error('Error creating conversation:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create conversation' });
      return null;
    }
  }, [user?.id]);

  // Search conversations
  const searchConversations = useCallback((query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
  }, []);

  // Clear search
  const clearSearch = useCallback(() => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: '' });
  }, []);

  // Retry connection
  const retryConnection = useCallback(() => {
    socket.reconnect();
  }, [socket]);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  // Load conversations on mount
  useEffect(() => {
    if (user?.id) {
      loadConversations();
    }
  }, [user?.id, loadConversations]);

  // Update connection status
  useEffect(() => {
    dispatch({
      type: 'UPDATE_CONNECTION_STATUS',
      payload: {
        isConnected: socket.isConnected,
        isAuthenticated: socket.isAuthenticated,
        connectionQuality: socket.connectionQuality,
      }
    });
  }, [socket.isConnected, socket.isAuthenticated, socket.connectionQuality]);

  const contextValue: ChatContextType = {
    state,
    actions: {
      loadConversations,
      loadMessages,
      selectConversation,
      sendMessage,
      deleteMessage,
      markAsRead,
      createConversation,
      searchConversations,
      clearSearch,
      retryConnection,
      clearError,
    },
    socket: {
      isConnected: socket.isConnected,
      isAuthenticated: socket.isAuthenticated,
      connectionQuality: socket.connectionQuality,
      sendMessage: socket.sendMessage,
      joinConversation: socket.joinConversation,
      leaveConversation: socket.leaveConversation,
      startTyping: socket.startTyping,
      stopTyping: socket.stopTyping,
    },
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

export const useEnhancedChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useEnhancedChat must be used within an EnhancedChatProvider');
  }
  return context;
};
