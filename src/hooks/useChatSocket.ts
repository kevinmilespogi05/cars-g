import { useEffect, useRef, useCallback, useState } from 'react';
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

  // Initialize socket connection
  useEffect(() => {
    if (!userId) return;

    // Prevent multiple connections
    if (socketRef.current) {
      console.log('Socket already exists, skipping new connection');
      return;
    }

    const chatServerUrl = import.meta.env.DEV ? 'http://localhost:3001' : (import.meta.env.VITE_CHAT_SERVER_URL || config.api.baseUrl);
    console.log('Creating new socket connection to:', chatServerUrl);
    
    socketRef.current = io(chatServerUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      forceNew: false,
      upgrade: true,
      rememberUpgrade: true,
    });

    const socket = socketRef.current;

    // Connection events
    socket.on('connect', () => {
      console.log('Connected to chat server');
      setIsConnected(true);
      
      // Authenticate user after connection
      socket.emit('authenticate', userId);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from chat server');
      setIsConnected(false);
      setIsAuthenticated(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setIsConnected(false);
    });

    // Authentication events
    socket.on('authenticated', (data) => {
      console.log('Authenticated with chat server:', data);
      setIsAuthenticated(true);
      onAuthenticated?.(data);
    });

    socket.on('auth_error', (error) => {
      console.error('Authentication error:', error);
      setIsAuthenticated(false);
      onAuthError?.(error);
    });

    // Chat events
    socket.on('new_message', (message: ChatMessage) => {
      console.log('New message received:', message);
      onMessage?.(message);
    });

    socket.on('user_typing', (data) => {
      onTyping?.(data.userId, data.username);
    });

    socket.on('user_stopped_typing', (data) => {
      onTypingStop?.(data.userId);
    });

    return () => {
      if (socket) {
        console.log('Cleaning up socket connection');
        socket.disconnect();
        socketRef.current = null;
      }
    };
  }, [userId]); // Only depend on userId, not the callback functions

  // Update event listeners when callbacks change (without recreating socket)
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !isConnected) return;

    // Remove existing listeners
    socket.off('new_message');
    socket.off('user_typing');
    socket.off('user_stopped_typing');
    socket.off('authenticated');
    socket.off('auth_error');

    // Add new listeners
    socket.on('new_message', (message: ChatMessage) => {
      console.log('New message received:', message);
      onMessage?.(message);
    });

    socket.on('user_typing', (data) => {
      onTyping?.(data.userId, data.username);
    });

    socket.on('user_stopped_typing', (data) => {
      onTypingStop?.(data.userId);
    });

    socket.on('authenticated', (data) => {
      console.log('Authenticated with chat server:', data);
      setIsAuthenticated(true);
      onAuthenticated?.(data);
    });

    socket.on('auth_error', (error) => {
      console.error('Authentication error:', error);
      setIsAuthenticated(false);
      onAuthError?.(error);
    });
  }, [onMessage, onTyping, onTypingStop, onAuthenticated, onAuthError, isConnected]);

  // Send message
  const sendMessage = useCallback((
    conversationId: string,
    content: string,
    messageType: string = 'text'
  ) => {
    if (!socketRef.current || !isAuthenticated) {
      console.error('Socket not connected or not authenticated');
      return;
    }

    console.log('Sending message via socket:', {
      conversationId,
      content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
      messageType,
      userId
    });

    socketRef.current.emit('send_message', {
      conversation_id: conversationId,
      sender_id: userId,
      content,
      message_type: messageType,
    });
  }, [userId, isAuthenticated]);

  // Join conversation
  const joinConversation = useCallback((conversationId: string) => {
    if (!socketRef.current || !isAuthenticated) {
      console.error('Socket not connected or not authenticated');
      return;
    }

    socketRef.current.emit('join_conversation', conversationId);
  }, [isAuthenticated]);

  // Leave conversation
  const leaveConversation = useCallback((conversationId: string) => {
    if (!socketRef.current || !isAuthenticated) {
      console.error('Socket not connected or not authenticated');
      return;
    }

    socketRef.current.emit('leave_conversation', conversationId);
  }, [isAuthenticated]);

  // Start typing indicator
  const startTyping = useCallback((conversationId: string) => {
    if (!socketRef.current || !isAuthenticated) {
      console.error('Socket not connected or not authenticated');
      return;
    }

    socketRef.current.emit('typing_start', conversationId);
  }, [isAuthenticated]);

  // Stop typing indicator
  const stopTyping = useCallback((conversationId: string) => {
    if (!socketRef.current || !isAuthenticated) {
      console.error('Socket not connected or not authenticated');
      return;
    }

    socketRef.current.emit('typing_stop', conversationId);
  }, [isAuthenticated]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  }, []);

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