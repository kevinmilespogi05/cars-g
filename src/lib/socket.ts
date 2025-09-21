import { io, Socket } from 'socket.io-client';
import { SocketEvents } from '../types';
import { getAccessToken } from './jwt';

class SocketManager {
  private socket: Socket<SocketEvents> | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  async connect(): Promise<void> {
    if (this.socket?.connected || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      console.log('Attempting socket connection with token:', token.substring(0, 20) + '...');

      const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
      
      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true
      });

      this.setupEventListeners();
      
      return new Promise((resolve, reject) => {
        if (!this.socket) {
          reject(new Error('Socket initialization failed'));
          return;
        }

        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        this.socket.on('connect', () => {
          console.log('Socket connected:', this.socket?.id);
          
          // Authenticate after connection
          console.log('Sending authentication token...');
          this.socket?.emit('authenticate', { token });
        });

        this.socket.on('authenticated', (data) => {
          clearTimeout(timeout);
          this.reconnectAttempts = 0;
          this.isConnecting = false;
          console.log('Socket authenticated successfully:', data);
          resolve();
        });

        this.socket.on('auth_error', (data) => {
          clearTimeout(timeout);
          this.isConnecting = false;
          console.error('Socket authentication error:', data);
          reject(new Error(data.error || 'Authentication failed'));
        });

        this.socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          this.isConnecting = false;
          console.error('Socket connection error:', error);
          reject(error);
        });

        this.socket.on('chat_connected', (data) => {
          if (data.success) {
            console.log('Chat connected successfully');
          } else {
            console.error('Chat connection failed:', data.message);
          }
        });

        this.socket.on('chat_error', (data) => {
          console.error('Chat error:', data.error);
          // Don't reject the connection for chat errors, just log them
        });
      });

    } catch (error) {
      this.isConnecting = false;
      console.error('Socket connection error:', error);
      throw error;
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.handleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.handleReconnect();
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.reconnectAttempts = 0;
    }
  }

  getSocket(): Socket<SocketEvents> | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Chat specific methods
  joinAdminChat(userId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('join_admin_chat', { userId });
    }
  }

  sendMessage(message: string, receiverId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('send_message', { message, receiverId });
    }
  }

  markMessagesAsRead(messageIds: string[]): void {
    if (this.socket?.connected) {
      this.socket.emit('mark_messages_read', { messageIds });
    }
  }

  markMessagesAsSeen(messageIds: string[]): void {
    if (this.socket?.connected) {
      this.socket.emit('mark_messages_seen', { messageIds });
    }
  }

  startTyping(receiverId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('typing_start', { receiverId });
    }
  }

  stopTyping(receiverId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('typing_stop', { receiverId });
    }
  }

  // Event listeners
  onMessageReceived(callback: (message: any) => void): void {
    if (this.socket) {
      this.socket.on('message_received', callback);
    }
  }

  onMessageSent(callback: (message: any) => void): void {
    if (this.socket) {
      this.socket.on('message_sent', callback);
    }
  }

  onMessagesRead(callback: (data: { messageIds: string[] }) => void): void {
    if (this.socket) {
      this.socket.on('messages_read', callback);
    }
  }

  onMessagesSeen(callback: (data: { messageIds: string[] }) => void): void {
    if (this.socket) {
      this.socket.on('messages_seen', callback);
    }
  }

  onMessageSeen(callback: (data: { messageId: string; seenAt: string; isRead: boolean }) => void): void {
    if (this.socket) {
      this.socket.on('message_seen', callback);
    }
  }

  onUserTyping(callback: (data: { userId: string; isTyping: boolean }) => void): void {
    if (this.socket) {
      this.socket.on('user_typing', callback);
    }
  }

  onAdminOnline(callback: (data: { isOnline: boolean }) => void): void {
    if (this.socket) {
      this.socket.on('admin_online', callback);
    }
  }

  onChatConnected(callback: (data: { success: boolean; message?: string }) => void): void {
    if (this.socket) {
      this.socket.on('chat_connected', callback);
    }
  }

  onChatError(callback: (data: { error: string }) => void): void {
    if (this.socket) {
      this.socket.on('chat_error', callback);
    }
  }

  // Remove event listeners
  offMessageReceived(callback: (message: any) => void): void {
    if (this.socket) {
      this.socket.off('message_received', callback);
    }
  }

  offMessageSent(callback: (message: any) => void): void {
    if (this.socket) {
      this.socket.off('message_sent', callback);
    }
  }

  offMessagesRead(callback: (data: { messageIds: string[] }) => void): void {
    if (this.socket) {
      this.socket.off('messages_read', callback);
    }
  }

  offMessagesSeen(callback: (data: { messageIds: string[] }) => void): void {
    if (this.socket) {
      this.socket.off('messages_seen', callback);
    }
  }

  offMessageSeen(callback: (data: { messageId: string; seenAt: string; isRead: boolean }) => void): void {
    if (this.socket) {
      this.socket.off('message_seen', callback);
    }
  }

  offUserTyping(callback: (data: { userId: string; isTyping: boolean }) => void): void {
    if (this.socket) {
      this.socket.off('user_typing', callback);
    }
  }

  offAdminOnline(callback: (data: { isOnline: boolean }) => void): void {
    if (this.socket) {
      this.socket.off('admin_online', callback);
    }
  }

  offChatConnected(callback: (data: { success: boolean; message?: string }) => void): void {
    if (this.socket) {
      this.socket.off('chat_connected', callback);
    }
  }

  offChatError(callback: (data: { error: string }) => void): void {
    if (this.socket) {
      this.socket.off('chat_error', callback);
    }
  }
}

export const socketManager = new SocketManager();
