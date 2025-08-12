import { useEffect, useRef, useState, useCallback } from 'react';
import { ChatMessage } from '../types/chat';
import { realTimeChatService } from '../services/realTimeChatService';

interface UseRealTimeChatOptions {
  roomId: string;
  onMessage?: (message: ChatMessage) => void;
  onTyping?: (userId: string, isTyping: boolean) => void;
  onReaction?: (messageId: string, reaction: string, count: number) => void;
  onPresence?: (userId: string, status: 'online' | 'offline') => void;
  onConnectionChange?: (status: 'connected' | 'connecting' | 'disconnected') => void;
}

export const useRealTimeChat = ({
  roomId,
  onMessage,
  onTyping,
  onReaction,
  onPresence,
  onConnectionChange
}: UseRealTimeChatOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const unsubscribeRefs = useRef<Array<() => void>>([]);

  // Initialize real-time connection
  const initializeConnection = useCallback(async () => {
    try {
      console.log(`🔌 Initializing real-time connection for room: ${roomId}`);
      
      // Subscribe to the room
      await realTimeChatService.subscribeToRoom(roomId);

      // Set up message subscription
      if (onMessage) {
        const messageUnsubscribe = realTimeChatService.onMessage(roomId, (message) => {
          onMessage(message);
        });
        unsubscribeRefs.current.push(messageUnsubscribe);
      }

      // Set up typing subscription
      if (onTyping) {
        const typingUnsubscribe = realTimeChatService.onTyping(roomId, (userId, isTyping) => {
          onTyping(userId, isTyping);
          setTypingUsers(prev => {
            const newSet = new Set(prev);
            if (isTyping) {
              newSet.add(userId);
            } else {
              newSet.delete(userId);
            }
            return newSet;
          });
        });
        unsubscribeRefs.current.push(typingUnsubscribe);
      }

      // Set up reaction subscription
      if (onReaction) {
        const reactionUnsubscribe = realTimeChatService.onReaction(roomId, (messageId, reaction, count) => {
          onReaction(messageId, reaction, count);
        });
        unsubscribeRefs.current.push(reactionUnsubscribe);
      }

      // Set up presence subscription
      if (onPresence) {
        const presenceUnsubscribe = realTimeChatService.onPresence(roomId, (userId, status) => {
          onPresence(userId, status);
          setOnlineUsers(prev => {
            const newSet = new Set(prev);
            if (status === 'online') {
              newSet.add(userId);
            } else {
              newSet.delete(userId);
            }
            return newSet;
          });
        });
        unsubscribeRefs.current.push(presenceUnsubscribe);
      }

      setIsConnected(true);
      setConnectionStatus('connected');

    } catch (error) {
      console.error('Failed to initialize real-time connection:', error);
      setConnectionStatus('disconnected');
      setIsConnected(false);
    }
  }, [roomId, onMessage, onTyping, onReaction, onPresence]);

  // Cleanup connection
  const cleanupConnection = useCallback(() => {
    console.log(`🔌 Cleaning up real-time connection for room: ${roomId}`);
    
    // Unsubscribe from all events
    unsubscribeRefs.current.forEach(unsubscribe => unsubscribe());
    unsubscribeRefs.current = [];

    // Unsubscribe from room
    realTimeChatService.unsubscribeFromRoom(roomId);
    
    setIsConnected(false);
    setConnectionStatus('disconnected');
    setOnlineUsers(new Set());
    setTypingUsers(new Set());
  }, [roomId]);

  // Send typing indicator
  const sendTypingIndicator = useCallback((isTyping: boolean = true) => {
    if (isConnected) {
      realTimeChatService.sendTypingIndicator(roomId, isTyping);
    }
  }, [roomId, isConnected]);

  // Update presence
  const updatePresence = useCallback((status: 'online' | 'away' | 'busy') => {
    if (isConnected) {
      realTimeChatService.updatePresence(roomId, status);
    }
  }, [roomId, isConnected]);

  // Monitor connection status
  useEffect(() => {
    const checkConnectionStatus = () => {
      const status = realTimeChatService.getConnectionStatus();
      setConnectionStatus(status);
      onConnectionChange?.(status);
    };

    // Check immediately
    checkConnectionStatus();

    // Check every 3 seconds
    const interval = setInterval(checkConnectionStatus, 3000);

    return () => clearInterval(interval);
  }, [onConnectionChange]);

  // Initialize connection on mount
  useEffect(() => {
    initializeConnection();

    // Cleanup on unmount
    return () => {
      cleanupConnection();
    };
  }, [initializeConnection, cleanupConnection]);

  // Reconnect when connection is lost
  useEffect(() => {
    if (connectionStatus === 'disconnected' && isConnected) {
      console.log('🔄 Connection lost, attempting to reconnect...');
      cleanupConnection();
      
      // Attempt to reconnect after a delay
      const timeout = setTimeout(() => {
        initializeConnection();
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [connectionStatus, isConnected, initializeConnection, cleanupConnection]);

  return {
    isConnected,
    connectionStatus,
    onlineUsers: Array.from(onlineUsers),
    typingUsers: Array.from(typingUsers),
    sendTypingIndicator,
    updatePresence,
    reconnect: initializeConnection
  };
}; 