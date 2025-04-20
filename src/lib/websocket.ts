import { ChatMessage, ChatRoom } from '@/types/chat';

type WebSocketEvent = 'message' | 'typing' | 'reaction' | 'message_update' | 'message_delete';

interface WebSocketMessage {
  type: WebSocketEvent;
  data: any;
}

class WebSocketService {
  private socket: WebSocket | null = null;
  private eventHandlers: Map<WebSocketEvent, Set<Function>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout = 1000;

  constructor() {
    this.connect();
  }

  private connect() {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.socket.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        const handlers = this.eventHandlers.get(message.type);
        if (handlers) {
          handlers.forEach(handler => handler(message.data));
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.socket.onclose = () => {
      console.log('WebSocket disconnected');
      this.handleReconnect();
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect();
      }, this.reconnectTimeout * this.reconnectAttempts);
    }
  }

  public subscribe(event: WebSocketEvent, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)?.add(handler);
  }

  public unsubscribe(event: WebSocketEvent, handler: Function) {
    this.eventHandlers.get(event)?.delete(handler);
  }

  public sendMessage(roomId: string, content: string) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'message',
        data: { roomId, content }
      }));
    }
  }

  public sendTypingIndicator(roomId: string, userId: string, isTyping: boolean = true) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'typing',
        data: { roomId, userId, isTyping }
      }));
    }
  }

  public sendReaction(messageId: string, reaction: string) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'reaction',
        data: { messageId, reaction }
      }));
    }
  }

  public updateMessage(messageId: string, content: string) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'message_update',
        data: { messageId, content }
      }));
    }
  }

  public deleteMessage(messageId: string) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'message_delete',
        data: { messageId }
      }));
    }
  }

  public disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export const websocketService = new WebSocketService(); 