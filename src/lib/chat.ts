import { supabase } from './supabase';
import { websocketService } from './websocket';
import { ChatRoom, ChatMessage, ChatParticipant } from '@/types/chat';

export const chatService = {
  async getRooms(userId: string): Promise<ChatRoom[]> {
    const { data, error } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  },

  async getMessages(roomId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        profiles:user_id (
          username,
          avatar_url
        )
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async sendMessage(roomId: string, content: string): Promise<ChatMessage> {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert([{ room_id: roomId, content }])
      .select()
      .single();

    if (error) throw error;
    
    // Send message through WebSocket
    websocketService.sendMessage(roomId, content);
    
    return data;
  },

  async getParticipants(roomId: string): Promise<ChatParticipant[]> {
    const { data, error } = await supabase
      .from('chat_participants')
      .select('*')
      .eq('room_id', roomId);

    if (error) throw error;
    return data || [];
  },

  subscribeToMessages(roomId: string, callback: (message: ChatMessage) => void) {
    const handler = (data: any) => {
      if (data.roomId === roomId) {
        callback(data.message);
      }
    };
    
    websocketService.subscribe('message', handler);
    return () => websocketService.unsubscribe('message', handler);
  },

  subscribeToTypingIndicators(roomId: string, callback: (userId: string, isTyping: boolean) => void) {
    const handler = (data: any) => {
      if (data.roomId === roomId) {
        callback(data.userId, data.isTyping);
      }
    };
    
    websocketService.subscribe('typing', handler);
    return () => websocketService.unsubscribe('typing', handler);
  },

  subscribeToReactions(roomId: string, callback: (messageId: string, reaction: string, count: number) => void) {
    const handler = (data: any) => {
      if (data.roomId === roomId) {
        callback(data.messageId, data.reaction, data.count);
      }
    };
    
    websocketService.subscribe('reaction', handler);
    return () => websocketService.unsubscribe('reaction', handler);
  },

  sendTypingIndicator(roomId: string, userId: string, isTyping: boolean = true) {
    websocketService.sendTypingIndicator(roomId, userId, isTyping);
  },

  async addReaction(messageId: string, reaction: string) {
    const { error } = await supabase
      .from('message_reactions')
      .insert([{ message_id: messageId, reaction }]);

    if (error) throw error;
    
    websocketService.sendReaction(messageId, reaction);
  },

  async removeReaction(messageId: string, reaction: string) {
    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('reaction', reaction);

    if (error) throw error;
    
    websocketService.sendReaction(messageId, reaction);
  },

  async updateMessage(messageId: string, content: string) {
    const { error } = await supabase
      .from('chat_messages')
      .update({ content })
      .eq('id', messageId);

    if (error) throw error;
    
    websocketService.updateMessage(messageId, content);
  },

  async deleteMessage(messageId: string) {
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('id', messageId);

    if (error) throw error;
    
    websocketService.deleteMessage(messageId);
  }
}; 