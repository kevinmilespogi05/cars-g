import { ChatMessage, ChatRoom, ChatParticipant } from '../types/chat';
import { useAuthStore } from '../store/authStore';

export interface WebSocketMessage {
  type: 'message' | 'typing' | 'reaction' | 'presence' | 'join' | 'leave' | 'error' | 'ping' | 'pong';
  roomId?: string;
  data?: any;
  timestamp: number;
  userId?: string;
}

export interface TypingIndicator {
  userId: string;
  roomId: string;
  isTyping: boolean;
  timestamp: number;
}

export interface MessageReaction {
  messageId: string;
  userId: string;
  reaction: string;
  timestamp: number;
}

export interface UserPresence {
  userId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: number;
}

export class WebSocketChatService {
  private static instance: WebSocketChatService;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionStatus: 'connected' | 'connecting' | 'disconnected' = 'disconnected';
  private messageQueue: WebSocketMessage[] = [];
  private isProcessingQueue = false;
  
  // Event callbacks
  private messageCallbacks: Map<string, Set<(message: ChatMessage) => void>> = new Map();
  private typingCallbacks: Map<string, Set<(userId: string, isTyping: boolean) => void>> = new Map();
  private reactionCallbacks: Map<string, Set<(messageId: string, reaction: string, count: number) => void>> = new Map();
  private presenceCallbacks: Map<string, Set<(userId: string, status: string) => void>> = new Map();
  private connectionCallbacks: Set<(status: string) => void> = new Set();
  private errorCallbacks: Set<(error: string) => void> = new Set();

  // Room subscriptions
  private subscribedRooms: Set<string> = new Set();
  private user: any = null;

  private constructor() {
    this.initializeUser();
  }

  public static getInstance(): WebSocketChatService {
    if (!WebSocketChatService.instance) {
      WebSocketChatService.instance = new WebSocketChatService();
    }
    return WebSocketChatService.instance;
  }

  private async initializeUser() {
    // Get user from auth store
    const authStore = useAuthStore.getState();
    this.user = authStore.user;
    
    // Listen for auth changes
    useAuthStore.subscribe((state) => {
      if (state.user !== this.user) {
        this.user = state.user;
        if (this.user && this.connectionStatus === 'disconnected') {
          this.connect();
        } else if (!this.user) {
          this.disconnect();
        }
      }
    });
  }

  public async connect(): Promise<void> {
    if (this.connectionStatus === 'connected' || this.connectionStatus === 'connecting') {
      return;
    }

    if (!this.user) {
      console.log('No user authenticated, cannot connect to WebSocket');
      return;
    }

    this.connectionStatus = 'connecting';
    this.notifyConnectionStatus('connecting');

    try {
      // Connect to WebSocket server
      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('🔌 WebSocket connected');
        this.connectionStatus = 'connected';
        this.reconnectAttempts = 0;
        this.notifyConnectionStatus('connected');
        this.startHeartbeat();
        this.processMessageQueue();
        
        // Re-subscribe to all rooms
        this.subscribedRooms.forEach(roomId => {
          this.subscribeToRoom(roomId);
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleIncomingMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        this.connectionStatus = 'disconnected';
        this.notifyConnectionStatus('disconnected');
        this.stopHeartbeat();
        
        if (event.code !== 1000) { // Not a normal closure
          this.attemptReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.notifyError('WebSocket connection error');
      };

    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.connectionStatus = 'disconnected';
      this.notifyConnectionStatus('disconnected');
      this.attemptReconnect();
    }
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'User logout');
      this.ws = null;
    }
    this.connectionStatus = 'disconnected';
    this.notifyConnectionStatus('disconnected');
    this.stopHeartbeat();
    this.subscribedRooms.clear();
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.notifyError('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.connectionStatus === 'connected' && this.ws) {
        this.sendMessage({
          type: 'ping',
          timestamp: Date.now()
        });
      }
    }, 30000); // Every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private sendMessage(message: WebSocketMessage): void {
    if (this.connectionStatus === 'connected' && this.ws) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        this.queueMessage(message);
      }
    } else {
      this.queueMessage(message);
    }
  }

  private queueMessage(message: WebSocketMessage): void {
    this.messageQueue.push(message);
    if (!this.isProcessingQueue) {
      this.processMessageQueue();
    }
  }

  private async processMessageQueue(): Promise<void> {
    if (this.isProcessingQueue || this.messageQueue.length === 0) return;
    
    this.isProcessingQueue = true;
    
    while (this.messageQueue.length > 0 && this.connectionStatus === 'connected') {
      const message = this.messageQueue.shift()!;
      try {
        if (this.ws) {
          this.ws.send(JSON.stringify(message));
        }
      } catch (error) {
        console.error('Failed to send queued message:', error);
        // Put message back at the front of the queue
        this.messageQueue.unshift(message);
        break;
      }
    }
    
    this.isProcessingQueue = false;
  }

  private handleIncomingMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'pong':
        // Heartbeat response, no action needed
        break;
        
      case 'message':
        this.handleChatMessage(message);
        break;
        
      case 'typing':
        this.handleTypingIndicator(message);
        break;
        
      case 'reaction':
        this.handleMessageReaction(message);
        break;
        
      case 'presence':
        this.handleUserPresence(message);
        break;
        
      case 'join':
        this.handleUserJoin(message);
        break;
        
      case 'leave':
        this.handleUserLeave(message);
        break;
        
      case 'error':
        this.notifyError(message.data?.error || 'Unknown error');
        break;
        
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  private handleChatMessage(message: WebSocketMessage): void {
    if (!message.roomId || !message.data) return;
    
    const callbacks = this.messageCallbacks.get(message.roomId);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(message.data as ChatMessage);
        } catch (error) {
          console.error('Error in message callback:', error);
        }
      });
    }
  }

  private handleTypingIndicator(message: WebSocketMessage): void {
    if (!message.roomId || !message.data) return;
    
    const { userId, isTyping } = message.data as TypingIndicator;
    const callbacks = this.typingCallbacks.get(message.roomId);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(userId, isTyping);
        } catch (error) {
          console.error('Error in typing callback:', error);
        }
      });
    }
  }

  private handleMessageReaction(message: WebSocketMessage): void {
    if (!message.roomId || !message.data) return;
    
    const { messageId, reaction, count } = message.data as MessageReaction & { count: number };
    const callbacks = this.reactionCallbacks.get(message.roomId);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(messageId, reaction, count);
        } catch (error) {
          console.error('Error in reaction callback:', error);
        }
      });
    }
  }

  private handleUserPresence(message: WebSocketMessage): void {
    if (!message.roomId || !message.data) return;
    
    const { userId, status } = message.data as UserPresence;
    const callbacks = this.presenceCallbacks.get(message.roomId);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(userId, status);
        } catch (error) {
          console.error('Error in presence callback:', error);
        }
      });
    }
  }

  private handleUserJoin(message: WebSocketMessage): void {
    if (!message.roomId || !message.data) return;
    
    const { userId } = message.data as { userId: string };
    const callbacks = this.presenceCallbacks.get(message.roomId);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(userId, 'online');
        } catch (error) {
          console.error('Error in join callback:', error);
        }
      });
    }
  }

  private handleUserLeave(message: WebSocketMessage): void {
    if (!message.roomId || !message.data) return;
    
    const { userId } = message.data as { userId: string };
    const callbacks = this.presenceCallbacks.get(message.roomId);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(userId, 'offline');
        } catch (error) {
          console.error('Error in leave callback:', error);
        }
      });
    }
  }

  // Public API methods
  public async subscribeToRoom(roomId: string): Promise<void> {
    if (this.subscribedRooms.has(roomId)) {
      return;
    }

    this.subscribedRooms.add(roomId);
    
    if (this.connectionStatus === 'connected') {
      this.sendMessage({
        type: 'join',
        roomId,
        timestamp: Date.now(),
        userId: this.user?.id
      });
    }
  }

  public unsubscribeFromRoom(roomId: string): void {
    this.subscribedRooms.delete(roomId);
    
    if (this.connectionStatus === 'connected') {
      this.sendMessage({
        type: 'leave',
        roomId,
        timestamp: Date.now(),
        userId: this.user?.id
      });
    }

    // Clean up callbacks
    this.messageCallbacks.delete(roomId);
    this.typingCallbacks.delete(roomId);
    this.reactionCallbacks.delete(roomId);
    this.presenceCallbacks.delete(roomId);
  }

  public async sendMessage(roomId: string, content: string, attachments?: string[]): Promise<void> {
    if (!this.user) {
      throw new Error('User not authenticated');
    }

    this.sendMessage({
      type: 'message',
      roomId,
      data: {
        content,
        attachments,
        senderId: this.user.id,
        timestamp: Date.now()
      },
      timestamp: Date.now(),
      userId: this.user.id
    });
  }

  public async sendTypingIndicator(roomId: string, isTyping: boolean): Promise<void> {
    if (!this.user) return;

    this.sendMessage({
      type: 'typing',
      roomId,
      data: {
        userId: this.user.id,
        roomId,
        isTyping,
        timestamp: Date.now()
      },
      timestamp: Date.now(),
      userId: this.user.id
    });
  }

  public async sendReaction(messageId: string, roomId: string, reaction: string): Promise<void> {
    if (!this.user) return;

    this.sendMessage({
      type: 'reaction',
      roomId,
      data: {
        messageId,
        userId: this.user.id,
        reaction,
        timestamp: Date.now()
      },
      timestamp: Date.now(),
      userId: this.user.id
    });
  }

  public async updatePresence(roomId: string, status: 'online' | 'away' | 'busy'): Promise<void> {
    if (!this.user) return;

    this.sendMessage({
      type: 'presence',
      roomId,
      data: {
        userId: this.user.id,
        status,
        lastSeen: Date.now()
      },
      timestamp: Date.now(),
      userId: this.user.id
    });
  }

  // Event listeners
  public onMessage(roomId: string, callback: (message: ChatMessage) => void): () => void {
    if (!this.messageCallbacks.has(roomId)) {
      this.messageCallbacks.set(roomId, new Set());
    }
    this.messageCallbacks.get(roomId)!.add(callback);

    return () => {
      const callbacks = this.messageCallbacks.get(roomId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.messageCallbacks.delete(roomId);
        }
      }
    };
  }

  public onTyping(roomId: string, callback: (userId: string, isTyping: boolean) => void): () => void {
    if (!this.typingCallbacks.has(roomId)) {
      this.typingCallbacks.set(roomId, new Set());
    }
    this.typingCallbacks.get(roomId)!.add(callback);

    return () => {
      const callbacks = this.typingCallbacks.get(roomId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.typingCallbacks.delete(roomId);
        }
      }
    };
  }

  public onReaction(roomId: string, callback: (messageId: string, reaction: string, count: number) => void): () => void {
    if (!this.reactionCallbacks.has(roomId)) {
      this.reactionCallbacks.set(roomId, new Set());
    }
    this.reactionCallbacks.get(roomId)!.add(callback);

    return () => {
      const callbacks = this.reactionCallbacks.get(roomId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.reactionCallbacks.delete(roomId);
        }
      }
    };
  }

  public onPresence(roomId: string, callback: (userId: string, status: string) => void): () => void {
    if (!this.presenceCallbacks.has(roomId)) {
      this.presenceCallbacks.set(roomId, new Set());
    }
    this.presenceCallbacks.get(roomId)!.add(callback);

    return () => {
      const callbacks = this.presenceCallbacks.get(roomId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.presenceCallbacks.delete(roomId);
        }
      }
    };
  }

  public onConnectionStatus(callback: (status: string) => void): () => void {
    this.connectionCallbacks.add(callback);
    return () => {
      this.connectionCallbacks.delete(callback);
    };
  }

  public onError(callback: (error: string) => void): () => void {
    this.errorCallbacks.add(callback);
    return () => {
      this.errorCallbacks.delete(callback);
    };
  }

  private notifyConnectionStatus(status: string): void {
    this.connectionCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in connection status callback:', error);
      }
    });
  }

  private notifyError(error: string): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (error) {
        console.error('Error in error callback:', error);
      }
    });
  }

  public getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' {
    return this.connectionStatus;
  }

  public destroy(): void {
    this.disconnect();
    
    // Clear all callbacks
    this.messageCallbacks.clear();
    this.typingCallbacks.clear();
    this.reactionCallbacks.clear();
    this.presenceCallbacks.clear();
    this.connectionCallbacks.clear();
    this.errorCallbacks.clear();
    
    // Clear queues
    this.messageQueue = [];
    this.subscribedRooms.clear();
    
    console.log('🧹 WebSocket chat service destroyed');
  }
}

// Export singleton instance
export const websocketChatService = WebSocketChatService.getInstance(); 