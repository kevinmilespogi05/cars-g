import { supabase } from '../lib/supabaseClient';
import { ChatRoom, ChatMessage, ChatParticipant } from '../types/chat';

export const chatService = {
  // Chat Rooms
  async createRoom(name: string): Promise<ChatRoom | null> {
    const { data, error } = await supabase
      .rpc('create_chat_room', { room_name: name })
      .returns<ChatRoom>();

    if (error) throw error;
    return data;
  },

  async getRooms(): Promise<ChatRoom[]> {
    const { data, error } = await supabase
      .from('chat_rooms')
      .select('*')
      .order('updated_at', { ascending: false })
      .returns<ChatRoom[]>();

    if (error) throw error;
    return data || [];
  },

  async deleteRoom(roomId: string): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('delete_chat_room', { target_room_id: roomId });

    if (error) throw error;
    return !!data;
  },

  // Direct Messaging
  async createDirectMessageRoom(otherUserId: string): Promise<ChatRoom | null> {
    // First get the other user's username
    const { data: otherUser, error: userError } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', otherUserId)
      .single();

    if (userError) throw userError;
    if (!otherUser) throw new Error('User not found');

    const { data, error } = await supabase
      .rpc('create_direct_message_room', { 
        other_user_id: otherUserId,
        room_name: `${otherUser.username}`
      })
      .returns<ChatRoom>();

    if (error) throw error;
    return data;
  },

  // Messages
  async sendMessage(roomId: string, content: string): Promise<ChatMessage | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('chat_messages')
      .insert([
        {
          room_id: roomId,
          content,
          sender_id: user.id,
        },
      ])
      .select()
      .single()
      .returns<ChatMessage>();

    if (error) throw error;
    return data;
  },

  async deleteMessage(messageId: string): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('delete_message', { message_id: messageId });

    if (error) throw error;
    return !!data;
  },

  async getMessages(roomId: string): Promise<ChatMessage[]> {
    // First get blocked users to filter them out
    const { data: blockedUsers, error: blockError } = await supabase
      .from('blocked_users')
      .select('blocked_id')
      .returns<{ blocked_id: string }[]>();
    
    if (blockError) throw blockError;
    
    // Get list of blocked user IDs
    const blockedIds = blockedUsers?.map(bu => bu.blocked_id) || [];

    // Get messages excluding ones from blocked users
    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        profiles:sender_id (
          username,
          avatar_url
        )
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .returns<ChatMessage[]>();

    if (error) throw error;
    
    // Filter out messages from blocked users if any
    return (data || []).filter(message => 
      !blockedIds.includes(message.sender_id)
    );
  },

  // Participants
  async addParticipant(roomId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('chat_participants')
      .insert([{ room_id: roomId, user_id: userId }]);

    if (error) throw error;
  },

  async getParticipants(roomId: string): Promise<ChatParticipant[]> {
    const { data, error } = await supabase
      .from('chat_participants')
      .select('*')
      .eq('room_id', roomId)
      .returns<ChatParticipant[]>();

    if (error) throw error;
    return data || [];
  },

  // User actions - Block, Unblock, Mute, Unmute
  async blockUser(userId: string): Promise<void> {
    const { error } = await supabase
      .from('blocked_users')
      .insert([{ blocker_id: (await supabase.auth.getUser()).data.user?.id, blocked_id: userId }]);

    if (error) throw error;
  },

  async unblockUser(userId: string): Promise<void> {
    const { error } = await supabase
      .from('blocked_users')
      .delete()
      .match({ 
        blocker_id: (await supabase.auth.getUser()).data.user?.id, 
        blocked_id: userId 
      });

    if (error) throw error;
  },

  async getBlockedUsers(): Promise<string[]> {
    const { data, error } = await supabase
      .from('blocked_users')
      .select('blocked_id')
      .returns<{ blocked_id: string }[]>();

    if (error) throw error;
    return (data || []).map(item => item.blocked_id);
  },

  async muteRoom(roomId: string): Promise<void> {
    const { error } = await supabase
      .from('muted_rooms')
      .insert([{ user_id: (await supabase.auth.getUser()).data.user?.id, room_id: roomId }]);

    if (error) throw error;
  },

  async unmuteRoom(roomId: string): Promise<void> {
    const { error } = await supabase
      .from('muted_rooms')
      .delete()
      .match({ 
        user_id: (await supabase.auth.getUser()).data.user?.id, 
        room_id: roomId
      });

    if (error) throw error;
  },

  async getMutedRooms(): Promise<string[]> {
    const { data, error } = await supabase
      .from('muted_rooms')
      .select('room_id')
      .returns<{ room_id: string }[]>();

    if (error) throw error;
    return (data || []).map(item => item.room_id);
  },

  // Real-time subscriptions
  subscribeToMessages(roomId: string, callback: (message: ChatMessage) => void) {
    console.log('Subscribing to messages for room:', roomId);
    
    const subscription = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          console.log('Received message:', payload);
          
          // Check if message is from blocked user before calling callback
          this.getBlockedUsers().then(blockedIds => {
            if (!blockedIds.includes(payload.new.sender_id)) {
              callback(payload.new as ChatMessage);
            } else {
              console.log('Message from blocked user filtered:', payload.new.sender_id);
            }
          });
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      console.log('Unsubscribing from messages for room:', roomId);
      subscription.unsubscribe();
    };
  },
}; 