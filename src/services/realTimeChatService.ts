import { supabase } from '../lib/supabase';
import { ChatMessage, ChatRoom } from '../types/chat';

export class RealTimeChatService {
  private static instance: RealTimeChatService;
  private connections: Map<string, any> = new Map();
  private messageCallbacks: Map<string, Set<(message: ChatMessage) => void>> = new Map();
  private typingCallbacks: Map<string, Set<(userId: string, isTyping: boolean) => void>> = new Map();
  private reactionCallbacks: Map<string, Set<(messageId: string, reaction: string, count: number) => void>> = new Map();
  private presenceCallbacks: Map<string, Set<(userId: string, status: 'online' | 'offline') => void>> = new Map();
  private connectionStatus: 'connected' | 'connecting' | 'disconnected' = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private messageQueue: Array<{ roomId: string; message: ChatMessage }> = [];
  private isProcessingQueue = false;
  private connectionCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startConnectionMonitoring();
    this.startHeartbeat();
  }

  public static getInstance(): RealTimeChatService {
    if (!RealTimeChatService.instance) {
      RealTimeChatService.instance = new RealTimeChatService();
    }
    return RealTimeChatService.instance;
  }

  private startConnectionMonitoring() {
    // Monitor connection status by checking if channels are active
    this.connectionCheckInterval = setInterval(() => {
      const hasActiveConnections = this.connections.size > 0;
      const allChannelsConnected = Array.from(this.connections.values()).every(
        (connection: any) => {
          // Check if the connection object has the correct structure
          if (connection && connection.channel) {
            // For Supabase channels, we can check if the channel is subscribed
            return connection.channel.subscribe && connection.channel.subscribe.status === 'SUBSCRIBED';
          }
          return false;
        }
      );

      if (hasActiveConnections && allChannelsConnected) {
        if (this.connectionStatus !== 'connected') {
          console.log('🟢 Real-time connection established');
          this.connectionStatus = 'connected';
          this.reconnectAttempts = 0;
          this.processMessageQueue();
        }
      } else if (hasActiveConnections && !allChannelsConnected) {
        if (this.connectionStatus !== 'connecting') {
          console.log('🟡 Real-time connection connecting...');
          this.connectionStatus = 'connecting';
        }
      } else {
        if (this.connectionStatus !== 'disconnected') {
          console.log('🔴 Real-time connection lost');
          this.connectionStatus = 'disconnected';
          this.attemptReconnect();
        }
      }
    }, 5000); // Check every 5 seconds
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.connectionStatus === 'connected' && this.connections.size > 0) {
        // Send a simple query to keep connection alive
        this.sendHeartbeat();
      }
    }, 30000); // Every 30 seconds
  }

  private async sendHeartbeat() {
    try {
      // Send a simple query to keep the connection alive
      await supabase
        .from('chat_messages')
        .select('id')
        .limit(1);
    } catch (error) {
      console.log('Heartbeat failed, connection might be down');
    }
  }

  private async attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    this.connectionStatus = 'connecting';
    
    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      // Reconnect all active subscriptions
      this.reconnectAllSubscriptions();
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  private async reconnectAllSubscriptions() {
    const roomIds = Array.from(this.connections.keys());
    
    for (const roomId of roomIds) {
      await this.subscribeToRoom(roomId);
    }
  }

  private async processMessageQueue() {
    if (this.isProcessingQueue || this.messageQueue.length === 0) return;
    
    this.isProcessingQueue = true;
    
    while (this.messageQueue.length > 0) {
      const { roomId, message } = this.messageQueue.shift()!;
      const callbacks = this.messageCallbacks.get(roomId);
      
      if (callbacks) {
        callbacks.forEach(callback => {
          try {
            callback(message);
          } catch (error) {
            console.error('Error in message callback:', error);
          }
        });
      }
    }
    
    this.isProcessingQueue = false;
  }

  public async subscribeToRoom(roomId: string): Promise<void> {
    if (this.connections.has(roomId)) {
      console.log(`Already subscribed to room: ${roomId}`);
      return;
    }

    try {
      console.log(`🔌 Subscribing to room: ${roomId}`);
      
      const channel = supabase
        .channel(`room:${roomId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `room_id=eq.${roomId}`,
          },
          async (payload) => {
            await this.handleNewMessage(roomId, payload.new as ChatMessage);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'chat_messages',
            filter: `room_id=eq.${roomId}`,
          },
          async (payload) => {
            await this.handleMessageUpdate(roomId, payload.new as ChatMessage);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'chat_messages',
            filter: `room_id=eq.${roomId}`,
          },
          async (payload) => {
            await this.handleMessageDelete(roomId, payload.old.id);
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'typing_indicators',
            filter: `room_id=eq.${roomId}`,
          },
          (payload) => {
            this.handleTypingIndicator(roomId, payload);
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'message_reactions',
            filter: `message_id=in.(select id from chat_messages where room_id=eq.${roomId})`,
          },
          (payload) => {
            this.handleReactionUpdate(roomId, payload);
          }
        )
        .on('presence', { event: 'sync' }, () => {
          this.handlePresenceSync(roomId);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          this.handlePresenceJoin(roomId, key, newPresences);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          this.handlePresenceLeave(roomId, key, leftPresences);
        });

      // Subscribe to the channel
      const subscription = await channel.subscribe(async (status) => {
        console.log(`Room ${roomId} subscription status:`, status);
        if (status === 'SUBSCRIBED') {
          this.connections.set(roomId, channel);
          // Track presence for this room
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await channel.track({ 
                user_id: user.id,
                status: 'online',
                last_seen: new Date().toISOString()
              });
            }
          } catch (error) {
            console.error('Failed to track presence:', error);
          }
        }
      });

      // Store the subscription for cleanup
      this.connections.set(roomId, { channel, subscription });

    } catch (error) {
      console.error(`Failed to subscribe to room ${roomId}:`, error);
      throw error;
    }
  }

  public unsubscribeFromRoom(roomId: string): void {
    const connection = this.connections.get(roomId);
    if (connection) {
      console.log(`🔌 Unsubscribing from room: ${roomId}`);
      
      if (connection.channel) {
        connection.channel.unsubscribe();
      }
      
      this.connections.delete(roomId);
      this.messageCallbacks.delete(roomId);
      this.typingCallbacks.delete(roomId);
      this.reactionCallbacks.delete(roomId);
      this.presenceCallbacks.delete(roomId);
    }
  }

  private async handleNewMessage(roomId: string, messageData: any): Promise<void> {
    try {
      // Get user profile for the message
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', messageData.sender_id)
        .single();

      const message: ChatMessage = {
        ...messageData,
        profiles: profile || {
          username: 'Unknown User',
          avatar_url: null
        }
      };

      // Add to queue if connection is not ready
      if (this.connectionStatus !== 'connected') {
        this.messageQueue.push({ roomId, message });
        return;
      }

      // Notify all callbacks
      const callbacks = this.messageCallbacks.get(roomId);
      if (callbacks) {
        callbacks.forEach(callback => {
          try {
            callback(message);
          } catch (error) {
            console.error('Error in message callback:', error);
          }
        });
      }
    } catch (error) {
      console.error('Error handling new message:', error);
    }
  }

  private async handleMessageUpdate(roomId: string, messageData: any): Promise<void> {
    // Handle message updates (e.g., edited messages)
    console.log('Message updated:', messageData);
  }

  private async handleMessageDelete(roomId: string, messageId: string): Promise<void> {
    // Handle message deletions
    console.log('Message deleted:', messageId);
  }

  private handleTypingIndicator(roomId: string, payload: any): void {
    const callbacks = this.typingCallbacks.get(roomId);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(payload.new.user_id, payload.new.is_typing);
        } catch (error) {
          console.error('Error in typing callback:', error);
        }
      });
    }
  }

  private handleReactionUpdate(roomId: string, payload: any): void {
    const callbacks = this.reactionCallbacks.get(roomId);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          // Calculate reaction count
          const count = payload.eventType === 'INSERT' ? 1 : -1;
          callback(payload.new.message_id, payload.new.reaction, count);
        } catch (error) {
          console.error('Error in reaction callback:', error);
        }
      });
    }
  }

  private handlePresenceSync(roomId: string): void {
    // Handle presence sync
    console.log('Presence sync for room:', roomId);
  }

  private handlePresenceJoin(roomId: string, key: string, presences: any[]): void {
    const callbacks = this.presenceCallbacks.get(roomId);
    if (callbacks) {
      presences.forEach(presence => {
        callbacks.forEach(callback => {
          try {
            callback(presence.user_id, 'online');
          } catch (error) {
            console.error('Error in presence callback:', error);
          }
        });
      });
    }
  }

  private handlePresenceLeave(roomId: string, key: string, presences: any[]): void {
    const callbacks = this.presenceCallbacks.get(roomId);
    if (callbacks) {
      presences.forEach(presence => {
        callbacks.forEach(callback => {
          try {
            callback(presence.user_id, 'offline');
          } catch (error) {
            console.error('Error in presence callback:', error);
          }
        });
      });
    }
  }

  // Public API methods
  public onMessage(roomId: string, callback: (message: ChatMessage) => void): () => void {
    if (!this.messageCallbacks.has(roomId)) {
      this.messageCallbacks.set(roomId, new Set());
    }
    this.messageCallbacks.get(roomId)!.add(callback);

    // Return unsubscribe function
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

  public onPresence(roomId: string, callback: (userId: string, status: 'online' | 'offline') => void): () => void {
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

  public getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' {
    return this.connectionStatus;
  }

  public async sendTypingIndicator(roomId: string, isTyping: boolean = true): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      await supabase
        .from('typing_indicators')
        .upsert(
          {
            room_id: roomId,
            user_id: user.id,
            is_typing: isTyping,
            updated_at: new Date().toISOString()
          },
          {
            onConflict: 'room_id,user_id',
            ignoreDuplicates: false
          }
        );
    } catch (error) {
      console.error('Failed to send typing indicator:', error);
    }
  }

  public async updatePresence(roomId: string, status: 'online' | 'away' | 'busy'): Promise<void> {
    const connection = this.connections.get(roomId);
    if (connection && connection.channel) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await connection.channel.track({ 
          user_id: user.id,
          status,
          last_seen: new Date().toISOString()
        });
      }
    }
  }

  public destroy(): void {
    // Cleanup all connections
    this.connections.forEach((connection, roomId) => {
      this.unsubscribeFromRoom(roomId);
    });

    // Clear all callbacks
    this.messageCallbacks.clear();
    this.typingCallbacks.clear();
    this.reactionCallbacks.clear();
    this.presenceCallbacks.clear();

    // Stop intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }

    console.log('🧹 Real-time chat service destroyed');
  }
}

// Export singleton instance
export const realTimeChatService = RealTimeChatService.getInstance(); 