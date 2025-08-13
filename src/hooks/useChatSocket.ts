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

    const chatServerUrl = import.meta.env.VITE_CHAT_SERVER_URL || config.api.baseUrl;
    socketRef.current = io(chatServerUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
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
        socket.disconnect();
      }
    };
  }, [userId, onMessage, onTyping, onTypingStop, onAuthenticated, onAuthError]);

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