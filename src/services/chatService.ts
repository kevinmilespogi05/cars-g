import { supabase } from '../lib/supabase';
import { ChatRoom, ChatMessage, ChatParticipant } from '../types/chat';

export class ChatServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChatServiceError';
  }
}

export const chatService = {
  // Chat Rooms
  async createRoom(name: string): Promise<ChatRoom> {
    const { data, error } = await supabase
      .rpc('create_chat_room', { room_name: name })
      .returns<ChatRoom>();

    if (error) throw new ChatServiceError(`Failed to create room: ${error.message}`);
    if (!data) throw new ChatServiceError('No data returned from create room');
    return data;
  },

  async getRooms(): Promise<ChatRoom[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ChatServiceError('User not authenticated');

    // First get the list of deleted room IDs
    const { data: deletedRooms, error: deletedError } = await supabase
      .from('chat_deletions')
      .select('room_id')
      .eq('user_id', user.id);

    if (deletedError) throw new ChatServiceError(`Failed to get deleted rooms: ${deletedError.message}`);

    const deletedRoomIds = deletedRooms?.map(dr => dr.room_id) || [];

    // Get all rooms that the user is a participant in and not deleted
    let query = supabase
      .from('chat_rooms')
      .select(`
        *,
        chat_participants (
          user_id
        )
      `)
      .eq('chat_participants.user_id', user.id);

    // Only add the not.in filter if there are deleted rooms
    if (deletedRoomIds.length > 0) {
      query = query.not('id', 'in', `(${deletedRoomIds.join(',')})`);
    }

    const { data: rooms, error } = await query;

    if (error) throw new ChatServiceError(`Failed to get rooms: ${error.message}`);
    if (!rooms) return [];

    // For each room, get all participants
    const roomsWithParticipants = await Promise.all(
      rooms.map(async (room) => {
        const { data: participants } = await supabase
          .from('chat_participants')
          .select('user_id')
          .eq('room_id', room.id);
        
        return {
          ...room,
          chat_participants: participants || []
        };
      })
    );

    // For direct message rooms, get the usernames of other participants
    const directMessageRooms = roomsWithParticipants.filter(room => room.is_direct_message);
    if (directMessageRooms.length > 0) {
      // Get all unique user IDs from direct message rooms
      const otherUserIds = new Set<string>();
      directMessageRooms.forEach(room => {
        const otherParticipants = room.chat_participants.filter(p => p.user_id !== user.id);
        otherParticipants.forEach(p => otherUserIds.add(p.user_id));
      });

      // Fetch usernames for all other participants
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', Array.from(otherUserIds));

      if (profilesError) throw new ChatServiceError(`Failed to get profiles: ${profilesError.message}`);

      // Create a map of user ID to username
      const usernameMap = new Map(profiles?.map(p => [p.id, p.username]) || []);

      // Update room names with usernames
      return roomsWithParticipants.map(room => {
        if (room.is_direct_message) {
          const otherParticipants = room.chat_participants.filter(p => p.user_id !== user.id);
          if (otherParticipants.length > 0) {
            const username = usernameMap.get(otherParticipants[0].user_id);
            if (username) {
              return {
                ...room,
                name: username
              };
            }
          }
        }
        return room;
      });
    }

    return roomsWithParticipants;
  },

  async deleteRoom(roomId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ChatServiceError('User not authenticated');

    const { error } = await supabase
      .from('chat_deletions')
      .insert([{ user_id: user.id, room_id: roomId }]);

    if (error) throw new ChatServiceError(`Failed to delete room: ${error.message}`);
    return true;
  },

  async restoreRoom(roomId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ChatServiceError('User not authenticated');

    const { error } = await supabase
      .from('chat_deletions')
      .delete()
      .match({ user_id: user.id, room_id: roomId });

    if (error) throw new ChatServiceError(`Failed to restore room: ${error.message}`);
    return true;
  },

  // Direct Messaging
  async createDirectMessageRoom(otherUserId: string): Promise<ChatRoom> {
    const { data: otherUser, error: userError } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', otherUserId)
      .single();

    if (userError) throw new ChatServiceError(`Failed to get user: ${userError.message}`);
    if (!otherUser) throw new ChatServiceError('User not found');

    const { data, error } = await supabase
      .rpc('create_direct_message_room', { 
        other_user_id: otherUserId,
        room_name: `${otherUser.username}`
      })
      .returns<ChatRoom>();

    if (error) throw new ChatServiceError(`Failed to create DM room: ${error.message}`);
    if (!data) throw new ChatServiceError('No data returned from create DM room');
    return data;
  },

  // Messages
  async sendMessage(roomId: string, content: string): Promise<ChatMessage> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ChatServiceError('User not authenticated');

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

    if (error) throw new ChatServiceError(`Failed to send message: ${error.message}`);
    if (!data) throw new ChatServiceError('No data returned from send message');
    return data;
  },

  async deleteMessage(messageId: string): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('delete_message', { message_id: messageId });

    if (error) throw new ChatServiceError(`Failed to delete message: ${error.message}`);
    return !!data;
  },

  async getMessages(roomId: string): Promise<ChatMessage[]> {
    try {
      // Get blocked users
      const { data: blockedUsers, error: blockError } = await supabase
        .from('blocked_users')
        .select('blocked_id')
        .returns<{ blocked_id: string }[]>();
      
      if (blockError) throw blockError;
      
      const blockedIds = blockedUsers?.map(bu => bu.blocked_id) || [];

      // Get messages with reactions
      const { data: messages, error: messagesError } = await supabase
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

      if (messagesError) throw messagesError;

      // Get reactions for all messages
      const { data: reactions, error: reactionsError } = await supabase
        .from('message_reactions')
        .select('message_id, reaction')
        .in('message_id', messages?.map(m => m.id) || [])
        .returns<Array<{ message_id: string; reaction: string }>>();

      if (reactionsError) throw reactionsError;

      // Count reactions in memory
      const reactionCounts = reactions?.reduce((acc, reaction) => {
        const key = `${reaction.message_id}-${reaction.reaction}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Combine messages with their reactions
      const messagesWithReactions = messages?.map(message => {
        const messageReactions = Object.entries(reactionCounts)
          .filter(([key]) => key.startsWith(message.id))
          .map(([key, count]) => ({
            reaction: key.split('-')[1],
            count
          }));

        return {
          ...message,
          reactions: messageReactions
        };
      }) || [];

      return messagesWithReactions.filter(message => 
        !blockedIds.includes(message.sender_id)
      );
    } catch (error) {
      throw new ChatServiceError(`Failed to get messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Participants
  async addParticipant(roomId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('chat_participants')
      .insert([{ room_id: roomId, user_id: userId }]);

    if (error) throw new ChatServiceError(`Failed to add participant: ${error.message}`);
  },

  async getParticipants(roomId: string): Promise<ChatParticipant[]> {
    const { data, error } = await supabase
      .from('chat_participants')
      .select('*')
      .eq('room_id', roomId)
      .returns<ChatParticipant[]>();

    if (error) throw new ChatServiceError(`Failed to get participants: ${error.message}`);
    return data || [];
  },

  // User actions
  async blockUser(userId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ChatServiceError('User not authenticated');

    const { error } = await supabase
      .from('blocked_users')
      .insert([{ blocker_id: user.id, blocked_id: userId }]);

    if (error) throw new ChatServiceError(`Failed to block user: ${error.message}`);
  },

  async unblockUser(userId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ChatServiceError('User not authenticated');

    const { error } = await supabase
      .from('blocked_users')
      .delete()
      .match({ 
        blocker_id: user.id, 
        blocked_id: userId 
      });

    if (error) throw new ChatServiceError(`Failed to unblock user: ${error.message}`);
  },

  async getBlockedUsers(): Promise<string[]> {
    const { data, error } = await supabase
      .from('blocked_users')
      .select('blocked_id')
      .returns<{ blocked_id: string }[]>();

    if (error) throw new ChatServiceError(`Failed to get blocked users: ${error.message}`);
    return (data || []).map(item => item.blocked_id);
  },

  async muteRoom(roomId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ChatServiceError('User not authenticated');

    const { error } = await supabase
      .from('muted_rooms')
      .insert([{ user_id: user.id, room_id: roomId }]);

    if (error) throw new ChatServiceError(`Failed to mute room: ${error.message}`);
  },

  async unmuteRoom(roomId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ChatServiceError('User not authenticated');

    const { error } = await supabase
      .from('muted_rooms')
      .delete()
      .match({ 
        user_id: user.id, 
        room_id: roomId
      });

    if (error) throw new ChatServiceError(`Failed to unmute room: ${error.message}`);
  },

  async getMutedRooms(): Promise<string[]> {
    const { data, error } = await supabase
      .from('muted_rooms')
      .select('room_id')
      .returns<{ room_id: string }[]>();

    if (error) throw new ChatServiceError(`Failed to get muted rooms: ${error.message}`);
    return (data || []).map(item => item.room_id);
  },

  // Real-time subscriptions
  subscribeToMessages(roomId: string, callback: (message: ChatMessage) => void) {
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
        async (payload) => {
          try {
            const blockedIds = await this.getBlockedUsers();
            if (!blockedIds.includes(payload.new.sender_id)) {
              // Fetch the profile information for the new message
              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', payload.new.sender_id)
                .single();

              if (!profileError && profile) {
                callback({
                  ...payload.new,
                  profiles: profile
                } as ChatMessage);
              } else {
                callback(payload.new as ChatMessage);
              }
            }
          } catch (error) {
            console.error('Error in message subscription:', error);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  },

  // Typing indicators
  async sendTypingIndicator(roomId: string, userId: string, isTyping: boolean = true): Promise<void> {
    const { error } = await supabase
      .from('typing_indicators')
      .upsert(
        {
          room_id: roomId,
          user_id: userId,
          is_typing: isTyping,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'room_id,user_id',
          ignoreDuplicates: false
        }
      );

    if (error) throw new ChatServiceError(`Failed to send typing indicator: ${error.message}`);
  },

  subscribeToTypingIndicators(roomId: string, callback: (userId: string, isTyping: boolean) => void) {
    const subscription = supabase
      .channel(`typing:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          callback(payload.new.user_id, payload.new.is_typing);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  },

  // Message Reactions
  async addReaction(messageId: string, reaction: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ChatServiceError('User not authenticated');

    const { error } = await supabase
      .from('message_reactions')
      .upsert(
        {
          message_id: messageId,
          user_id: user.id,
          reaction,
          created_at: new Date().toISOString()
        },
        {
          onConflict: 'message_id,user_id,reaction',
          ignoreDuplicates: false
        }
      );

    if (error) throw new ChatServiceError(`Failed to add reaction: ${error.message}`);
  },

  async removeReaction(messageId: string, reaction: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ChatServiceError('User not authenticated');

    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .match({
        message_id: messageId,
        user_id: user.id,
        reaction
      });

    if (error) throw new ChatServiceError(`Failed to remove reaction: ${error.message}`);
  },

  async getMessageReactions(messageId: string): Promise<Array<{ reaction: string; count: number }>> {
    const { data, error } = await supabase
      .from('message_reactions')
      .select('reaction')
      .eq('message_id', messageId)
      .returns<Array<{ reaction: string }>>();

    if (error) throw new ChatServiceError(`Failed to get message reactions: ${error.message}`);
    
    // Count reactions in memory
    const reactionCounts = data?.reduce((acc, { reaction }) => {
      acc[reaction] = (acc[reaction] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Convert to array format
    return Object.entries(reactionCounts).map(([reaction, count]) => ({
      reaction,
      count
    }));
  },

  subscribeToReactions(roomId: string, callback: (messageId: string, reaction: string, count: number) => void) {
    const subscription = supabase
      .channel(`reactions:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
          filter: `message_id=in.(select id from chat_messages where room_id=eq.${roomId})`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Get the current count of this reaction
            const { data: existingReactions } = await supabase
              .from('message_reactions')
              .select('reaction')
              .eq('message_id', payload.new.message_id)
              .eq('reaction', payload.new.reaction);

            const count = existingReactions?.length || 0;
            callback(payload.new.message_id, payload.new.reaction, count);
          } else if (payload.eventType === 'DELETE') {
            // Get the current count of this reaction
            const { data: existingReactions } = await supabase
              .from('message_reactions')
              .select('reaction')
              .eq('message_id', payload.old.message_id)
              .eq('reaction', payload.old.reaction);

            const count = existingReactions?.length || 0;
            callback(payload.old.message_id, payload.old.reaction, -count);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  },
}; 