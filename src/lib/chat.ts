import { supabase } from './supabaseClient';
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

  async sendMessage(message: Omit<ChatMessage, 'id' | 'created_at'>): Promise<ChatMessage> {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert([message])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getParticipants(roomId: string): Promise<ChatParticipant[]> {
    const { data, error } = await supabase
      .from('chat_participants')
      .select('*')
      .eq('room_id', roomId);

    if (error) throw error;
    return data || [];
  }
}; 