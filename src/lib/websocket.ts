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
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastPongTime: number = Date.now();
  private eventHandlers = new Map<WebSocketEvent, ((data: any) => void)[]>();
  private config: Required<WebSocketConfig> = {
    maxReconnectAttempts: 5,
    reconnectInterval: 3000,
    connectionTimeout: 10000,
  };

  constructor(config?: WebSocketConfig) {
    this.config = { ...this.config, ...config };
  }

  private connect() {
    if (this.socket?.readyState === WebSocket.CONNECTING) {
      return;
    }

    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
    this.socket = new WebSocket(wsUrl);

    // Set connection timeout
    const connectionTimeout = setTimeout(() => {
      if (this.socket?.readyState !== WebSocket.OPEN) {
        this.socket?.close();
        this.handleReconnect();
      }
    }, this.config.connectionTimeout);

    this.socket.onopen = () => {
      console.log('WebSocket connected');
      clearTimeout(connectionTimeout);
      this.reconnectAttempts = 0;
      this.startHeartbeat();
    };

    this.socket.onmessage = (event) => {
      try {
        if (event.data === 'pong') {
          this.handlePong();
          return;
        }

        const message: WebSocketMessage = JSON.parse(event.data);
        const handlers = this.eventHandlers.get(message.type);
        if (handlers) {
          handlers.forEach(handler => handler(message.data));
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        this.handleError(new Error('Failed to parse WebSocket message'));
      }
    };

    this.socket.onclose = (event) => {
      console.log('WebSocket disconnected', event.code, event.reason);
      clearTimeout(connectionTimeout);
      this.cleanup();
      this.handleReconnect();
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.handleError(error instanceof Error ? error : new Error('WebSocket error'));
      this.cleanup();
    };
  }

  private handleError(error: Error) {
    // Implement custom error handling logic here
    console.error('WebSocket error:', error);
    // You could emit an error event or call a callback
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts);
    console.log(`Attempting to reconnect in ${delay}ms...`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  private cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send('ping');
        
        // Check if we haven't received a pong in a while
        if (Date.now() - this.lastPongTime > this.config.connectionTimeout) {
          console.warn('No pong received, reconnecting...');
          this.socket.close();
        }
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  private handlePong() {
    this.lastPongTime = Date.now();
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
}

export default WebSocketService; 