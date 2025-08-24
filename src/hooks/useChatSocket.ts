import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { ChatMessage } from '../types';
import { config } from '../lib/config';

interface UseChatSocketProps {
  userId: string;
  onMessage?: (message: ChatMessage) => void;
  onTyping?: (userId: string, username: string) => void;
  onTypingStop?: (userId: string) => void;
  onAuthenticated?: (user: any) => void;
  onAuthError?: (error: any) => void;
}

interface UseChatSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  isAuthenticated: boolean;
  sendMessage: (conversationId: string, content: string, messageType?: string) => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  disconnect: () => void;
}

// Global socket instance for connection pooling
let globalSocket: Socket | null = null;
let globalSocketUsers = new Set<string>();

// Message batching for better performance
const messageBatch = new Map<string, Array<{ content: string; messageType: string; timestamp: number }>>();
const BATCH_DELAY = 50; // 50ms batch delay
const BATCH_TIMERS = new Map<string, NodeJS.Timeout>();

// Typing debouncing
const typingTimers = new Map<string, NodeJS.Timeout>();
const TYPING_DEBOUNCE = 300; // 300ms debounce

export const useChatSocket = ({
  userId,
  onMessage,
  onTyping,
  onTypingStop,
  onAuthenticated,
  onAuthError,
}: UseChatSocketProps): UseChatSocketReturn => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const messageQueueRef = useRef<Array<{ conversationId: string; content: string; messageType: string }>>([]);
  const isProcessingRef = useRef(false);

  // Optimized socket configuration
  const socketConfig = useMemo(() => ({
    transports: ['websocket'], // Force WebSocket only for better performance
    autoConnect: false, // Manual connection control
    reconnection: true,
    reconnectionAttempts: 3,
    reconnectionDelay: 500,
    reconnectionDelayMax: 2000,
    timeout: 10000, // Reduced timeout
    forceNew: false,
    upgrade: false, // Disable upgrade for better performance
    rememberUpgrade: false,
    // Performance optimizations
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6, // 1MB
    allowEIO3: false, // Disable legacy support
  }), []);

  // Initialize socket connection with connection pooling
  useEffect(() => {
    if (!userId) return;

    // Use global socket if available and not at capacity
    if (globalSocket && globalSocket.connected && globalSocketUsers.size < 10) {
      socketRef.current = globalSocket;
      globalSocketUsers.add(userId);
      setIsConnected(true);
      
      // Authenticate user
      globalSocket.emit('authenticate', userId);
      return;
    }

    // Create new socket if needed
    if (!globalSocket || !globalSocket.connected) {
      const chatServerUrl = import.meta.env.DEV 
        ? 'http://localhost:3001' 
        : (import.meta.env.VITE_CHAT_SERVER_URL || config.api.baseUrl);
      
      console.log('Creating optimized socket connection to:', chatServerUrl);
      
      globalSocket = io(chatServerUrl, socketConfig);
      socketRef.current = globalSocket;
      globalSocketUsers.add(userId);

      // Connection events
      globalSocket.on('connect', () => {
        console.log('Connected to chat server');
        setIsConnected(true);
        globalSocket!.emit('authenticate', userId);
      });

      globalSocket.on('disconnect', () => {
        console.log('Disconnected from chat server');
        setIsConnected(false);
        setIsAuthenticated(false);
        globalSocketUsers.clear();
      });

      globalSocket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        setIsConnected(false);
      });

      // Authentication events
      globalSocket.on('authenticated', (data) => {
        console.log('Authenticated with chat server:', data);
        setIsAuthenticated(true);
        onAuthenticated?.(data);
      });

      globalSocket.on('auth_error', (error) => {
        console.error('Authentication error:', error);
        setIsAuthenticated(false);
        onAuthError?.(error);
      });

      // Connect the socket
      globalSocket.connect();
    }

    return () => {
      if (globalSocket && globalSocketUsers.has(userId)) {
        globalSocketUsers.delete(userId);
        if (globalSocketUsers.size === 0) {
          globalSocket.disconnect();
          globalSocket = null;
        }
      }
    };
  }, [userId, socketConfig, onAuthenticated, onAuthError]);

  // Optimized event listeners with memoization
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !isConnected) return;

    // Remove existing listeners
    socket.off('new_message');
    socket.off('user_typing');
    socket.off('user_stopped_typing');
    socket.off('message_deleted');

    // Add new listeners with debouncing
    socket.on('new_message', (message: ChatMessage) => {
      console.log('New message received:', message);
      onMessage?.(message);
    });

    socket.on('message_deleted', (data: { messageId: string; conversationId: string }) => {
      console.log('Message deleted:', data);
    });

    socket.on('user_typing', (data) => {
      // Debounce typing events
      const key = `${data.userId}-${data.conversationId || 'global'}`;
      if (typingTimers.has(key)) {
        clearTimeout(typingTimers.get(key)!);
      }
      
      onTyping?.(data.userId, data.username);
      
      const timer = setTimeout(() => {
        onTypingStop?.(data.userId);
        typingTimers.delete(key);
      }, TYPING_DEBOUNCE);
      
      typingTimers.set(key, timer);
    });

    socket.on('user_stopped_typing', (data) => {
      const key = `${data.userId}-${data.conversationId || 'global'}`;
      if (typingTimers.has(key)) {
        clearTimeout(typingTimers.get(key)!);
        typingTimers.delete(key);
      }
      onTypingStop?.(data.userId);
    });
  }, [onMessage, onTyping, onTypingStop, isConnected]);

  // Message batching function
  const flushMessageBatch = useCallback((conversationId: string) => {
    const batch = messageBatch.get(conversationId);
    if (!batch || batch.length === 0) return;

    const socket = socketRef.current;
    if (!socket || !isAuthenticated) return;

    // Send batched messages
    socket.emit('send_message_batch', {
      conversation_id: conversationId,
      messages: batch.map(msg => ({
        content: msg.content,
        message_type: msg.messageType,
        timestamp: msg.timestamp
      }))
    });

    // Clear batch
    messageBatch.delete(conversationId);
    const timer = BATCH_TIMERS.get(conversationId);
    if (timer) {
      clearTimeout(timer);
      BATCH_TIMERS.delete(conversationId);
    }
  }, [isAuthenticated]);

  // Optimized send message with batching
  const sendMessage = useCallback((
    conversationId: string,
    content: string,
    messageType: string = 'text'
  ) => {
    if (!socketRef.current || !isAuthenticated) {
      console.error('Socket not connected or not authenticated');
      return;
    }

    // Add to batch
    if (!messageBatch.has(conversationId)) {
      messageBatch.set(conversationId, []);
    }
    
    messageBatch.get(conversationId)!.push({
      content,
      messageType,
      timestamp: Date.now()
    });

    // Set batch timer
    if (!BATCH_TIMERS.has(conversationId)) {
      const timer = setTimeout(() => {
        flushMessageBatch(conversationId);
      }, BATCH_DELAY);
      BATCH_TIMERS.set(conversationId, timer);
    }

    console.log('Message queued for batch send:', {
      conversationId,
      content: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
      messageType,
      batchSize: messageBatch.get(conversationId)?.length || 0
    });
  }, [isAuthenticated, flushMessageBatch]);

  // Optimized conversation management
  const joinConversation = useCallback((conversationId: string) => {
    if (!socketRef.current || !isAuthenticated) {
      console.error('Socket not connected or not authenticated');
      return;
    }

    socketRef.current.emit('join_conversation', conversationId);
  }, [isAuthenticated]);

  const leaveConversation = useCallback((conversationId: string) => {
    if (!socketRef.current || !isAuthenticated) {
      console.error('Socket not connected or not authenticated');
      return;
    }

    // Flush any pending messages before leaving
    flushMessageBatch(conversationId);
    socketRef.current.emit('leave_conversation', conversationId);
  }, [isAuthenticated, flushMessageBatch]);

  // Optimized typing indicators with debouncing
  const startTyping = useCallback((conversationId: string) => {
    if (!socketRef.current || !isAuthenticated) {
      console.error('Socket not connected or not authenticated');
      return;
    }

    const key = `typing-${conversationId}`;
    if (typingTimers.has(key)) {
      clearTimeout(typingTimers.get(key)!);
    }

    socketRef.current.emit('typing_start', conversationId);
    
    const timer = setTimeout(() => {
      stopTyping(conversationId);
      typingTimers.delete(key);
    }, 3000); // Auto-stop typing after 3 seconds
    
    typingTimers.set(key, timer);
  }, [isAuthenticated]);

  const stopTyping = useCallback((conversationId: string) => {
    if (!socketRef.current || !isAuthenticated) {
      console.error('Socket not connected or not authenticated');
      return;
    }

    const key = `typing-${conversationId}`;
    if (typingTimers.has(key)) {
      clearTimeout(typingTimers.get(key)!);
      typingTimers.delete(key);
    }

    socketRef.current.emit('typing_stop', conversationId);
  }, [isAuthenticated]);

  // Cleanup function
  const disconnect = useCallback(() => {
    // Flush all pending message batches
    messageBatch.forEach((_, conversationId) => {
      flushMessageBatch(conversationId);
    });

    // Clear all timers
    BATCH_TIMERS.forEach(timer => clearTimeout(timer));
    BATCH_TIMERS.clear();
    typingTimers.forEach(timer => clearTimeout(timer));
    typingTimers.clear();

    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  }, [flushMessageBatch]);

  return {
    socket: socketRef.current,
    isConnected,
    isAuthenticated,
    sendMessage,
    joinConversation,
    leaveConversation,
    startTyping,
    stopTyping,
    disconnect,
  };
}; 