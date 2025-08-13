import { useState, useEffect } from 'react';
import { websocketChatService } from '../services/websocketChatService';
import { useAuthStore } from '../store/authStore';

export interface WebSocketChatState {
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  isConnected: boolean;
  isConnecting: boolean;
  isDisconnected: boolean;
  error: string | null;
  showConnectionError: boolean;
}

export const useWebSocketChat = (): WebSocketChatState => {
  const { user } = useAuthStore();
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [showConnectionError, setShowConnectionError] = useState(false);

  useEffect(() => {
    if (!user) {
      setConnectionStatus('disconnected');
      setError(null);
      setShowConnectionError(false);
      return;
    }

    // Initialize WebSocket connection
    websocketChatService.connect();

    // Setup event listeners
    const unsubscribeConnection = websocketChatService.onConnectionStatus((status) => {
      setConnectionStatus(status as 'connected' | 'connecting' | 'disconnected');
      setShowConnectionError(status === 'disconnected');
      
      if (status === 'connected') {
        setError(null);
      }
    });

    const unsubscribeError = websocketChatService.onError((errorMessage) => {
      setError(errorMessage);
      setShowConnectionError(true);
    });

    return () => {
      unsubscribeConnection();
      unsubscribeError();
    };
  }, [user]);

  return {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
    isDisconnected: connectionStatus === 'disconnected',
    error,
    showConnectionError,
  };
}; 