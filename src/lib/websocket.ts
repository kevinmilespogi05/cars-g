import { ChatMessage, ChatRoom } from '@/types/chat';

type WebSocketEvent = 'message' | 'typing' | 'reaction' | 'message_update' | 'message_delete';

interface WebSocketMessage<T = unknown> {
  type: WebSocketEvent;
  data: T;
}

interface WebSocketConfig {
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  connectionTimeout?: number;
}

class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private eventHandlers = new Map<string, ((data: any) => void)[]>();
  private readonly config = {
    connectionTimeout: 5000,
    heartbeatInterval: 30000,
    maxReconnectAttempts: 5,
    reconnectInterval: 1000,
    maxMessageSize: 1024 * 1024, // 1MB
  };

  constructor(config?: WebSocketConfig) {
    this.config = { ...this.config, ...config };
  }

  private connect() {
    if (this.socket?.readyState === WebSocket.CONNECTING) {
      return;
    }

    // Clear any existing timers
    this.cleanup();

    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
    this.socket = new WebSocket(wsUrl);

    // Set connection timeout
    const connectionTimeout = setTimeout(() => {
      if (this.socket?.readyState !== WebSocket.OPEN) {
        console.warn('WebSocket connection timeout');
        this.socket?.close();
        this.handleReconnect();
      }
    }, this.config.connectionTimeout);

    this.socket.onopen = () => {
      console.log('WebSocket connected');
      clearTimeout(connectionTimeout);
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.emit('connection', { status: 'connected' });
    };

    this.socket.onmessage = (event) => {
      try {
        // Check message size
        if (event.data.length > this.config.maxMessageSize) {
          throw new Error('Message size exceeds limit');
        }

        if (event.data === 'pong') {
          this.handlePong();
          return;
        }

        const message: WebSocketMessage = JSON.parse(event.data);
        const handlers = this.eventHandlers.get(message.type);
        if (handlers) {
          handlers.forEach(handler => {
            try {
              handler(message.data);
            } catch (error) {
              console.error('Error in message handler:', error);
              this.handleError(new Error('Handler execution failed'));
            }
          });
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
        this.handleError(new Error('Failed to process WebSocket message'));
      }
    };

    this.socket.onclose = (event) => {
      console.log('WebSocket disconnected', event.code, event.reason);
      clearTimeout(connectionTimeout);
      this.cleanup();
      
      // Don't reconnect if the closure was intentional
      if (!event.wasClean) {
        this.handleReconnect();
      } else {
        this.emit('connection', { status: 'disconnected', clean: true });
      }
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.handleError(error instanceof Error ? error : new Error('WebSocket error'));
      this.cleanup();
      this.emit('connection', { status: 'error', error });
    };
  }

  private handleError(error: Error) {
    console.error('WebSocket error:', error);
    this.emit('error', { error });
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('connection', { status: 'failed', reason: 'max_attempts' });
      return;
    }

    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts),
      30000 // Max delay of 30 seconds
    );
    
    console.log(`Attempting to reconnect in ${delay}ms... (attempt ${this.reconnectAttempts + 1}/${this.config.maxReconnectAttempts})`);
    this.emit('connection', { status: 'reconnecting', attempt: this.reconnectAttempts + 1 });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  private cleanup() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send('ping');
      }
    }, this.config.heartbeatInterval);
  }

  private handlePong() {
    // Handle pong logic
  }

  public addEventListener<T>(event: WebSocketEvent, callback: (data: T) => void) {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.push(callback as (data: any) => void);
    this.eventHandlers.set(event, handlers);
  }

  public removeEventListener(event: WebSocketEvent, callback: (data: any) => void) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(callback);
      if (index !== -1) {
        handlers.splice(index, 1);
        if (handlers.length === 0) {
          this.eventHandlers.delete(event);
        } else {
          this.eventHandlers.set(event, handlers);
        }
      }
    }
  }

  private send<T>(type: WebSocketEvent, data: T): boolean {
    if (this.socket?.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage<T> = { type, data };
      this.socket.send(JSON.stringify(message));
      return true;
    } else {
      console.warn('WebSocket is not connected. Message not sent:', { type, data });
      return false;
    }
  }

  public disconnect() {
    this.cleanup();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  private emit(type: string, data: any) {
    const handlers = this.eventHandlers.get(type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error('Error in event handler:', error);
        }
      });
    }
  }
}

export default WebSocketService; 