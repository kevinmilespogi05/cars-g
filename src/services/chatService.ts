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

    // First get the rooms with basic participant info
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

    // For each room, get the full participant details with profiles
    const roomsWithParticipants = await Promise.all(
      rooms.map(async (room) => {
        // First get the participant user IDs
        const { data: participants } = await supabase
          .from('chat_participants')
          .select('user_id')
          .eq('room_id', room.id);

        if (!participants) return { ...room, chat_participants: [] };

        // Then get the profiles for these users
        const userIds = participants.map(p => p.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, role')
          .in('id', userIds);

        // Combine the data
        const chatParticipants = participants.map(participant => ({
          user_id: participant.user_id,
          profiles: profiles?.find(p => p.id === participant.user_id) || null
        }));

        return {
          ...room,
          chat_participants: chatParticipants
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ChatServiceError('User not authenticated');

    // First check if a direct message room already exists between these users
    const { data: existingRooms, error: existingError } = await supabase
      .from('chat_rooms')
      .select(`
        *,
        chat_participants (
          user_id
        )
      `)
      .eq('is_direct_message', true)
      .or(`user_id.eq.${user.id},user_id.eq.${otherUserId}`, { foreignTable: 'chat_participants' });

    if (existingError) throw new ChatServiceError(`Failed to check existing rooms: ${existingError.message}`);

    // Find a room where both users are participants
    const existingRoom = existingRooms?.find(room => {
      const participantIds = room.chat_participants?.map(p => p.user_id) || [];
      return participantIds.includes(user.id) && participantIds.includes(otherUserId);
    });

    if (existingRoom) {
      // Get the full room data with profiles
      const { data: fullRoom, error: roomError } = await supabase
        .from('chat_rooms')
        .select(`
          *,
          chat_participants (
            user_id
          )
        `)
        .eq('id', existingRoom.id)
        .single();

      if (roomError) throw new ChatServiceError(`Failed to get room data: ${roomError.message}`);
      if (!fullRoom) throw new ChatServiceError('Room not found');

      // Get profiles for all participants
      const participantIds = fullRoom.chat_participants?.map(p => p.user_id) || [];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, role')
        .in('id', participantIds);

      if (profilesError) throw new ChatServiceError(`Failed to get profiles: ${profilesError.message}`);

      // Combine the data
      return {
        ...fullRoom,
        chat_participants: fullRoom.chat_participants?.map(participant => ({
          ...participant,
          profiles: profiles?.find(p => p.id === participant.user_id) || null
        })) || []
      };
    }

    // If no existing room, create a new one using a stored procedure
    const { data: newRoom, error: createError } = await supabase
      .rpc('create_direct_message_room', {
        other_user_id: otherUserId,
        room_name: 'Direct Message'
      });

    if (createError) throw new ChatServiceError(`Failed to create room: ${createError.message}`);
    if (!newRoom) throw new ChatServiceError('No room created');

    return newRoom;
  },

  // Messages
  async sendMessage(roomId: string, content: string): Promise<ChatMessage> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ChatServiceError('User not authenticated');

    // Create optimistic message object
    const optimisticMessage: ChatMessage = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      room_id: roomId,
      content,
      sender_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      profiles: {
        username: user.user_metadata?.username || user.email?.split('@')[0] || 'User',
        avatar_url: user.user_metadata?.avatar_url || null
      }
    };

    // Send message to database (fire and forget for speed)
    const insertPromise = supabase
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

    // Return optimistic message immediately
    // The real message will be updated via real-time subscription
    return optimisticMessage;
  },

  // Fast message sending without waiting for database response
  async sendMessageFast(roomId: string, content: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ChatServiceError('User not authenticated');

    // Send message to database asynchronously
    supabase
      .from('chat_messages')
      .insert([
        {
          room_id: roomId,
          content,
          sender_id: user.id,
        },
      ])
      .then(({ error }) => {
        if (error) {
          console.error('Failed to save message:', error);
          // Could implement retry logic here
        }
      })
      .catch(error => {
        console.error('Error sending message:', error);
      });
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
            // Check if user is blocked (use cached blocked users if available)
            const blockedIds = await this.getBlockedUsers();
            if (!blockedIds.includes(payload.new.sender_id)) {
              // Use cached profile data if available, otherwise fetch
              let profile = this._getCachedProfile(payload.new.sender_id);
              
              if (!profile) {
                // Fetch profile only if not cached
                const { data: profileData, error: profileError } = await supabase
                  .from('profiles')
                  .select('username, avatar_url')
                  .eq('id', payload.new.sender_id)
                  .single();

                if (!profileError && profileData) {
                  profile = profileData;
                  this._cacheProfile(payload.new.sender_id, profile);
                }
              }

              if (profile) {
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

  // Profile caching for faster message delivery
  private _profileCache = new Map<string, { username: string; avatar_url: string | null }>();
  private _cacheExpiry = new Map<string, number>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private _getCachedProfile(userId: string) {
    const expiry = this._cacheExpiry.get(userId);
    if (expiry && Date.now() < expiry) {
      return this._profileCache.get(userId);
    }
    // Clear expired cache
    this._profileCache.delete(userId);
    this._cacheExpiry.delete(userId);
    return null;
  }

  private _cacheProfile(userId: string, profile: { username: string; avatar_url: string | null }) {
    this._profileCache.set(userId, profile);
    this._cacheExpiry.set(userId, Date.now() + this.CACHE_TTL);
  }

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

  subscribeToRoomDeletions(callback: (roomId: string, userId: string) => void) {
    const subscription = supabase
      .channel('room_deletions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_deletions',
          filter: `user_id=eq.${supabase.auth.getUser().then(({ data }) => data.user?.id)}`
        },
        (payload) => {
          callback(payload.new.room_id, payload.new.user_id);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  },

  subscribeToRoomRestorations(callback: (roomId: string, userId: string) => void) {
    const subscription = supabase
      .channel('room_restorations')
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_deletions',
          filter: `user_id=eq.${supabase.auth.getUser().then(({ data }) => data.user?.id)}`
        },
        (payload) => {
          callback(payload.old.room_id, payload.old.user_id);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  },

  // Message batching for better performance
  private _messageBatch: Array<{ roomId: string; content: string; userId: string }> = [];
  private _batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 50; // 50ms batch delay

  async sendMessageBatched(roomId: string, content: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ChatServiceError('User not authenticated');

    // Add message to batch
    this._messageBatch.push({ roomId, content, userId: user.id });

    // Start batch timer if not already running
    if (!this._batchTimer) {
      this._batchTimer = setTimeout(() => {
        this._flushMessageBatch();
      }, this.BATCH_DELAY);
    }
  }

  private async _flushMessageBatch() {
    if (this._messageBatch.length === 0) return;

    const batch = [...this._messageBatch];
    this._messageBatch = [];
    this._batchTimer = null;

    try {
      // Insert all messages in a single database call
      const { data, error } = await supabase
        .from('chat_messages')
        .insert(batch.map(msg => ({
          room_id: msg.roomId,
          content: msg.content,
          sender_id: msg.userId,
        })))
        .select();

      if (error) {
        console.error('Batch message insert failed:', error);
        // Could implement retry logic here
      }
    } catch (error) {
      console.error('Error in batch message processing:', error);
    }
  },

  // Force flush any remaining messages
  async flushMessageBatch(): Promise<void> {
    if (this._batchTimer) {
      clearTimeout(this._batchTimer);
      this._batchTimer = null;
    }
    await this._flushMessageBatch();
  },
}; 