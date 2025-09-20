import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { ChatMessage } from '../types';
import { config } from '../lib/config';

interface UseEnhancedChatSocketProps {
  userId: string;
  onMessage?: (message: ChatMessage) => void;
  onTyping?: (userId: string, username: string) => void;
  onTypingStop?: (userId: string) => void;
  onAuthenticated?: (user: any) => void;
  onAuthError?: (error: any) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: string) => void;
}

interface UseEnhancedChatSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  isAuthenticated: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor';
  sendMessage: (conversationId: string, content: string, messageType?: string) => Promise<boolean>;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  disconnect: () => void;
  reconnect: () => void;
  getConnectionStats: () => {
    isConnected: boolean;
    isAuthenticated: boolean;
    connectionQuality: string;
    lastError?: string;
    reconnectAttempts: number;
  };
}

// Connection state management
class ConnectionManager {
  private static instance: ConnectionManager;
  private socket: Socket | null = null;
  private connectedUsers = new Set<string>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private lastError: string | null = null;
  private connectionQuality: 'excellent' | 'good' | 'poor' = 'good';
  private latencyMeasurements: number[] = [];
  private isConnecting = false;

  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  isAuthenticated(): boolean {
    return this.socket?.auth || false;
  }

  getConnectionQuality(): 'excellent' | 'good' | 'poor' {
    return this.connectionQuality;
  }

  getLastError(): string | null {
    return this.lastError;
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  async connect(userId: string, callbacks: {
    onConnect?: () => void;
    onDisconnect?: () => void;
    onAuthenticated?: (user: any) => void;
    onAuthError?: (error: any) => void;
    onError?: (error: string) => void;
  }): Promise<Socket> {
    if (this.socket?.connected) {
      return this.socket;
    }

    if (this.isConnecting) {
      // Wait for existing connection attempt
      return new Promise((resolve, reject) => {
        const checkConnection = () => {
          if (this.socket?.connected) {
            resolve(this.socket);
          } else if (!this.isConnecting) {
            reject(new Error('Connection failed'));
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      });
    }

    this.isConnecting = true;
    this.reconnectAttempts = 0;

    try {
      const chatServerUrl = import.meta.env.DEV 
        ? 'http://localhost:3001' 
        : (import.meta.env.VITE_CHAT_SERVER_URL || config.api.baseUrl);

      console.log('Connecting to chat server:', chatServerUrl);

      this.socket = io(chatServerUrl, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        reconnectionDelayMax: 5000, // Reduced for faster reconnection
        timeout: 15000, // Reduced timeout for faster connection
        forceNew: true,
        upgrade: true,
        rememberUpgrade: false,
        pingTimeout: 30000, // Reduced for faster disconnection detection
        pingInterval: 15000, // More frequent pings for better connection health
        maxHttpBufferSize: 1e6,
      });

      this.setupEventListeners(userId, callbacks);
      this.connectedUsers.add(userId);

      return this.socket;
    } catch (error) {
      this.isConnecting = false;
      this.lastError = error instanceof Error ? error.message : 'Connection failed';
      throw error;
    }
  }

  private setupEventListeners(
    userId: string, 
    callbacks: {
      onConnect?: () => void;
      onDisconnect?: () => void;
      onAuthenticated?: (user: any) => void;
      onAuthError?: (error: any) => void;
      onError?: (error: string) => void;
    }
  ) {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to chat server');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.lastError = null;
      this.connectionQuality = 'excellent';
      callbacks.onConnect?.();
      
      // Authenticate immediately after connection
      this.socket?.emit('authenticate', userId);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from chat server:', reason);
      this.isConnecting = false;
      this.connectionQuality = 'poor';
      callbacks.onDisconnect?.();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.isConnecting = false;
      this.reconnectAttempts++;
      this.lastError = error.message || 'Connection error';
      this.connectionQuality = 'poor';
      callbacks.onError?.(this.lastError);
    });

    this.socket.on('authenticated', (data) => {
      console.log('Authenticated with chat server:', data);
      this.socket!.auth = true;
      this.connectionQuality = 'excellent';
      callbacks.onAuthenticated?.(data);
    });

    this.socket.on('auth_error', (error) => {
      console.error('Authentication error:', error);
      this.lastError = error.message || 'Authentication failed';
      this.connectionQuality = 'poor';
      callbacks.onAuthError?.(error);
    });

    // Measure latency for connection quality
    this.socket.on('pong', () => {
      const latency = Date.now() - (this.socket as any).pingTime;
      
      // Use circular buffer to prevent memory leaks
      if (this.latencyMeasurements.length >= 20) {
        this.latencyMeasurements.shift();
      }
      this.latencyMeasurements.push(latency);
      
      const avgLatency = this.latencyMeasurements.reduce((a, b) => a + b, 0) / this.latencyMeasurements.length;
      
      // Enhanced connection quality thresholds for better real-time performance
      if (avgLatency < 30) {
        this.connectionQuality = 'excellent';
      } else if (avgLatency < 100) {
        this.connectionQuality = 'good';
      } else {
        this.connectionQuality = 'poor';
      }
      
      // Log connection quality changes for debugging
      if (this.latencyMeasurements.length === 1) {
        console.log(`Connection quality: ${this.connectionQuality} (${avgLatency.toFixed(1)}ms)`);
      }
    });

    // Enhanced ping mechanism for better connection monitoring
    setInterval(() => {
      if (this.socket?.connected) {
        (this.socket as any).pingTime = Date.now();
        this.socket.emit('ping');
      }
    }, 10000); // Ping every 10 seconds
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connectedUsers.clear();
    this.reconnectAttempts = 0;
    this.lastError = null;
    this.connectionQuality = 'good';
    this.isConnecting = false;
  }

  reconnect() {
    if (this.socket) {
      this.socket.connect();
    }
  }

  removeUser(userId: string) {
    this.connectedUsers.delete(userId);
    if (this.connectedUsers.size === 0) {
      this.disconnect();
    }
  }
}

// Typing indicator management
class TypingManager {
  private static instance: TypingManager;
  private typingUsers = new Map<string, Set<string>>();
  private timers = new Map<string, NodeJS.Timeout>();

  static getInstance(): TypingManager {
    if (!TypingManager.instance) {
      TypingManager.instance = new TypingManager();
    }
    return TypingManager.instance;
  }

  startTyping(conversationId: string, userId: string, username: string) {
    const key = `${conversationId}-${userId}`;
    
    // Clear existing timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!);
    }

    // Add to typing users
    if (!this.typingUsers.has(conversationId)) {
      this.typingUsers.set(conversationId, new Set());
    }
    this.typingUsers.get(conversationId)!.add(username);

    // Set auto-stop timer
    const timer = setTimeout(() => {
      this.stopTyping(conversationId, userId);
    }, 3000);
    
    this.timers.set(key, timer);
  }

  stopTyping(conversationId: string, userId: string) {
    const key = `${conversationId}-${userId}`;
    
    // Clear timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!);
      this.timers.delete(key);
    }

    // Remove from typing users
    if (this.typingUsers.has(conversationId)) {
      const users = this.typingUsers.get(conversationId)!;
      for (const [username, _] of users.entries()) {
        if (username.includes(userId)) {
          users.delete(username);
          break;
        }
      }
      
      if (users.size === 0) {
        this.typingUsers.delete(conversationId);
      }
    }
  }

  getTypingUsers(conversationId: string): string[] {
    return Array.from(this.typingUsers.get(conversationId) || []);
  }

  clearAll() {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.typingUsers.clear();
  }
}

export const useEnhancedChatSocket = ({
  userId,
  onMessage,
  onTyping,
  onTypingStop,
  onAuthenticated,
  onAuthError,
  onConnectionChange,
  onError,
}: UseEnhancedChatSocketProps): UseEnhancedChatSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor'>('good');
  const [lastError, setLastError] = useState<string | null>(null);
  
  const connectionManager = useMemo(() => ConnectionManager.getInstance(), []);
  const typingManager = useMemo(() => TypingManager.getInstance(), []);
  const socketRef = useRef<Socket | null>(null);

  // Initialize connection
  useEffect(() => {
    if (!userId) return;

    const connect = async () => {
      try {
        const socket = await connectionManager.connect(userId, {
          onConnect: () => {
            setIsConnected(true);
            onConnectionChange?.(true);
          },
          onDisconnect: () => {
            setIsConnected(false);
            setIsAuthenticated(false);
            onConnectionChange?.(false);
          },
          onAuthenticated: (user) => {
            setIsAuthenticated(true);
            onAuthenticated?.(user);
          },
          onAuthError: (error) => {
            setIsAuthenticated(false);
            setLastError(error.message || 'Authentication failed');
            onAuthError?.(error);
          },
          onError: (error) => {
            setLastError(error);
            onError?.(error);
          }
        });

        socketRef.current = socket;
        setupMessageListeners(socket);
      } catch (error) {
        console.error('Failed to connect to chat server:', error);
        setLastError(error instanceof Error ? error.message : 'Connection failed');
        onError?.(error instanceof Error ? error.message : 'Connection failed');
      }
    };

    connect();

    return () => {
      connectionManager.removeUser(userId);
    };
  }, [userId, onMessage, onTyping, onTypingStop, onAuthenticated, onAuthError, onConnectionChange, onError]);

  // Update connection quality
  useEffect(() => {
    const interval = setInterval(() => {
      const quality = connectionManager.getConnectionQuality();
      setConnectionQuality(quality);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Setup message listeners
  const setupMessageListeners = useCallback((socket: Socket) => {
    // Remove existing listeners
    socket.off('new_message');
    socket.off('new_messages_batch');
    socket.off('user_typing');
    socket.off('user_stopped_typing');
    socket.off('message_deleted');
    socket.off('message_error');

    // Add new listeners
    socket.on('new_message', (message: ChatMessage) => {
      console.log('New message received:', message);
      onMessage?.(message);
    });

    socket.on('new_messages_batch', (messages: ChatMessage[]) => {
      console.log('New messages batch received:', messages);
      messages.forEach(message => onMessage?.(message));
    });

    // Handle message errors
    socket.on('message_error', (error: { message: string }) => {
      console.error('Message error:', error);
      onError?.(error.message);
    });

    socket.on('user_typing', (data: { userId: string; username: string; conversationId: string }) => {
      console.log('User typing:', data);
      typingManager.startTyping(data.conversationId, data.userId, data.username);
      onTyping?.(data.userId, data.username);
    });

    socket.on('user_stopped_typing', (data: { userId: string; conversationId: string }) => {
      console.log('User stopped typing:', data);
      typingManager.stopTyping(data.conversationId, data.userId);
      onTypingStop?.(data.userId);
    });

    socket.on('message_deleted', (data: { messageId: string; conversationId: string }) => {
      console.log('Message deleted:', data);
    });
  }, [onMessage, onTyping, onTypingStop]);

  // Send message with retry logic
  const sendMessage = useCallback(async (
    conversationId: string,
    content: string,
    messageType: string = 'text'
  ): Promise<boolean> => {
    if (!socketRef.current || !isAuthenticated || !userId) {
      console.error('Socket not connected, not authenticated, or no user ID');
      return false;
    }

    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        return new Promise((resolve) => {
          const timeout = setTimeout(() => {
            resolve(false);
          }, 5000);

          socketRef.current!.emit('send_message', {
            conversation_id: conversationId,
            sender_id: userId,
            content,
            message_type: messageType
          }, (response: { success: boolean; error?: string }) => {
            clearTimeout(timeout);
            
            if (response.success) {
              resolve(true);
            } else if (response.error && retryCount < maxRetries - 1) {
              // Retry on certain errors
              if (response.error.includes('timeout') || response.error.includes('network')) {
                retryCount++;
                setTimeout(() => {
                  // Retry will be handled by the while loop
                  resolve(false);
                }, Math.pow(2, retryCount) * 1000); // Exponential backoff
              } else {
                resolve(false);
              }
            } else {
              resolve(false);
            }
          });
        });
      } catch (error) {
        console.error(`Error sending message (attempt ${retryCount + 1}):`, error);
        retryCount++;
        
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        }
      }
    }

    console.error('Failed to send message after all retries');
    return false;
  }, [isAuthenticated, userId]);

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

  // Start typing
  const startTyping = useCallback((conversationId: string) => {
    if (!socketRef.current || !isAuthenticated) {
      console.error('Socket not connected or not authenticated');
      return;
    }

    socketRef.current.emit('typing_start', conversationId);
  }, [isAuthenticated]);

  // Stop typing
  const stopTyping = useCallback((conversationId: string) => {
    if (!socketRef.current || !isAuthenticated) {
      console.error('Socket not connected or not authenticated');
      return;
    }

    socketRef.current.emit('typing_stop', conversationId);
  }, [isAuthenticated]);

  // Disconnect
  const disconnect = useCallback(() => {
    connectionManager.disconnect();
    typingManager.clearAll();
    socketRef.current = null;
    setIsConnected(false);
    setIsAuthenticated(false);
  }, []);

  // Reconnect
  const reconnect = useCallback(() => {
    connectionManager.reconnect();
  }, []);

  // Get connection stats
  const getConnectionStats = useCallback(() => ({
    isConnected: connectionManager.isConnected(),
    isAuthenticated: connectionManager.isAuthenticated(),
    connectionQuality: connectionManager.getConnectionQuality(),
    lastError: connectionManager.getLastError(),
    reconnectAttempts: connectionManager.getReconnectAttempts()
  }), []);

  return {
    socket: socketRef.current,
    isConnected,
    isAuthenticated,
    connectionQuality,
    sendMessage,
    joinConversation,
    leaveConversation,
    startTyping,
    stopTyping,
    disconnect,
    reconnect,
    getConnectionStats,
  };
};
