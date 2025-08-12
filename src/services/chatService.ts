import { supabase } from '../lib/supabase';
import { ChatRoom, ChatMessage, ChatParticipant } from '../types/chat';

export class ChatServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChatServiceError';
  }
}

// Private state variables (module-level)
let _messageBatch: Array<{ roomId: string; content: string; userId: string }> = [];
let _batchTimer: NodeJS.Timeout | null = null;
const BATCH_DELAY = 50; // 50ms batch delay

// Profile caching for faster message delivery
const _profileCache = new Map<string, { username: string; avatar_url: string | null }>();
const _cacheExpiry = new Map<string, number>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function _getCachedProfile(userId: string) {
  const expiry = _cacheExpiry.get(userId);
  if (expiry && Date.now() < expiry) {
    return _profileCache.get(userId);
  }
  // Clear expired cache
  _profileCache.delete(userId);
  _cacheExpiry.delete(userId);
  return null;
}

function _cacheProfile(userId: string, profile: { username: string; avatar_url: string | null }) {
  _profileCache.set(userId, profile);
  _cacheExpiry.set(userId, Date.now() + CACHE_TTL);
}

async function _flushMessageBatch() {
  if (_messageBatch.length === 0) return;

  const batch = [..._messageBatch];
  _messageBatch = [];
  _batchTimer = null;

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

  // Get all rooms for the current user
  async getRooms(): Promise<ChatRoom[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ChatServiceError('User not authenticated');

    console.log('Getting rooms for user:', user.id);

    try {
      // Step 1: Get room IDs where user is participant (simple query)
      const { data: participantRooms, error: participantError } = await supabase
        .from('chat_participants')
        .select('room_id')
        .eq('user_id', user.id);

      if (participantError) throw new ChatServiceError(`Failed to get participant rooms: ${participantError.message}`);

      if (!participantRooms || participantRooms.length === 0) {
        console.log('No rooms found for user');
        return [];
      }

      const roomIds = participantRooms.map(p => p.room_id);
      console.log('Room IDs found:', roomIds);

      // Step 2: Get room details (simple query)
      const { data: rooms, error: roomsError } = await supabase
        .from('chat_rooms')
        .select('*')
        .in('id', roomIds)
        .order('updated_at', { ascending: false });

      if (roomsError) throw new ChatServiceError(`Failed to get rooms: ${roomsError.message}`);

      if (!rooms || rooms.length === 0) {
        console.log('No room details found');
        return [];
      }

      console.log('Rooms found:', rooms.length);

      // Step 3: Get participants for each room (simple query without join)
      const { data: allParticipants, error: participantsError } = await supabase
        .from('chat_participants')
        .select('room_id, user_id')
        .in('room_id', roomIds);

      if (participantsError) throw new ChatServiceError(`Failed to get participants: ${participantsError.message}`);

      // Step 4: Get all unique user IDs to fetch profiles separately
      const allUserIds = new Set<string>();
      allParticipants?.forEach(p => allUserIds.add(p.user_id));

      // Step 5: Get profiles for all participants (separate query)
      let profilesMap = new Map<string, { username: string; avatar_url: string | null }>();
      if (allUserIds.size > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', Array.from(allUserIds));

        if (profilesError) {
          console.warn('Failed to get profiles:', profilesError);
          // Continue without profiles, use fallback values
        } else {
          profiles?.forEach(profile => {
            profilesMap.set(profile.id, {
              username: profile.username,
              avatar_url: profile.avatar_url
            });
          });
        }
      }

      // Group participants by room
      const participantsByRoom = new Map<string, any[]>();
      allParticipants?.forEach(p => {
        if (!participantsByRoom.has(p.room_id)) {
          participantsByRoom.set(p.room_id, []);
        }
        participantsByRoom.get(p.room_id)!.push(p);
      });

      // Step 6: Build the final room objects
      const roomsWithParticipants = rooms.map(room => {
        const chatParticipants = participantsByRoom.get(room.id) || [];
        
        // Convert to the expected format
        const participants = chatParticipants.map(p => {
          const profile = profilesMap.get(p.user_id);
          return {
            id: p.user_id,
            user_id: p.user_id,
            room_id: p.room_id,
            username: profile?.username || 'Unknown',
            avatar_url: profile?.avatar_url || null,
            role: 'member' // Default role
          };
        });

        return {
          ...room,
          chat_participants: chatParticipants,
          participants: participants,
          isGroup: !room.is_direct_message
        };
      });

      // Step 7: For direct message rooms, update names with usernames
      const directMessageRooms = roomsWithParticipants.filter(room => room.is_direct_message);
      if (directMessageRooms.length > 0) {
        console.log('Processing direct message rooms:', directMessageRooms.length);
        
        // Get all unique user IDs from direct message rooms
        const otherUserIds = new Set<string>();
        directMessageRooms.forEach(room => {
          const otherParticipants = room.chat_participants?.filter((p: any) => p.user_id !== user.id) || [];
          otherParticipants.forEach((p: any) => otherUserIds.add(p.user_id));
        });

        console.log('Other user IDs found:', Array.from(otherUserIds));

        if (otherUserIds.size > 0) {
          // Update room names with usernames using the profiles we already fetched
          const updatedRooms = roomsWithParticipants.map(room => {
            if (room.is_direct_message) {
              // Get all participants for this room
              const allParticipants = room.chat_participants || [];
              console.log(`Room ${room.id} has ${allParticipants.length} total participants:`, allParticipants.map((p: any) => p.user_id));
              console.log(`Current user ID: ${user.id}`);
              
              // Find the other participant (not the current user)
              const otherParticipant = allParticipants.find((p: any) => p.user_id !== user.id);
              
              if (otherParticipant) {
                // Get the username for the other participant from our profiles map
                const otherProfile = profilesMap.get(otherParticipant.user_id);
                console.log(`Other participant ID: ${otherParticipant.user_id}, Username: ${otherProfile?.username}`);
                
                if (otherProfile?.username) {
                  // Update the room name to show the other participant's username
                  const updatedRoom = {
                    ...room,
                    name: otherProfile.username
                  };
                  console.log(`Updated room ${room.id} name from "${room.name}" to "${otherProfile.username}"`);
                  return updatedRoom;
                } else {
                  console.warn(`No username found for other participant ${otherParticipant.user_id} in room ${room.id}`);
                  // Keep the room but with a fallback name
                  return {
                    ...room,
                    name: room.name || 'Direct Message'
                  };
                }
              } else {
                console.warn(`No other participant found for direct message room ${room.id}`);
                // This might be a room where the current user is the only participant
                // Try to get the room creator's username as fallback
                const roomCreator = room.created_by;
                if (roomCreator && roomCreator !== user.id) {
                  const creatorProfile = profilesMap.get(roomCreator);
                  if (creatorProfile?.username) {
                    console.log(`Using room creator username for room ${room.id}: ${creatorProfile.username}`);
                    return {
                      ...room,
                      name: creatorProfile.username
                    };
                  }
                }
                // Keep the room but with a fallback name
                return {
                  ...room,
                  name: room.name || 'Direct Message'
                };
              }
            }
            return room;
          });

          return updatedRooms;
        }
      }

      return roomsWithParticipants;
    } catch (error) {
      console.error('Error getting rooms:', error);
      throw new ChatServiceError(`Failed to get rooms: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Force update direct message room names to show correct usernames
  async updateDirectMessageRoomNames(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ChatServiceError('User not authenticated');

    console.log('Updating direct message room names...');

    try {
      // Use the optimized database function instead of complex joins
      const { data, error } = await supabase.rpc('update_direct_message_room_names', {
        user_uuid: user.id
      });

      if (error) {
        console.error('Error updating room names:', error);
        throw new ChatServiceError(`Failed to update room names: ${error.message}`);
      }

      console.log('Direct message room names updated successfully');
    } catch (error) {
      console.error('Error updating room names:', error);
      throw new ChatServiceError(`Failed to update room names: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Cleanup function to fix orphaned direct message rooms
  async cleanupOrphanedRooms(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ChatServiceError('User not authenticated');

    console.log('Starting cleanup of orphaned direct message rooms...');

    try {
      // Find direct message rooms with insufficient participants
      const { data: orphanedRooms, error: orphanedError } = await supabase
        .from('chat_rooms')
        .select(`
          id,
          name,
          is_direct_message,
          chat_participants!inner(user_id)
        `)
        .eq('is_direct_message', true);

      if (orphanedError) {
        console.error('Error finding orphaned rooms:', orphanedError);
        return;
      }

      if (!orphanedRooms) {
        console.log('No orphaned rooms found');
        return;
      }

      // Group participants by room
      const roomParticipants = new Map<string, string[]>();
      orphanedRooms.forEach(room => {
        const participants = room.chat_participants?.map((p: any) => p.user_id) || [];
        roomParticipants.set(room.id, participants);
      });

      // Find rooms with less than 2 participants
      const roomsToDelete: string[] = [];
      roomParticipants.forEach((participants, roomId) => {
        if (participants.length < 2) {
          console.log(`Found orphaned room ${roomId} with ${participants.length} participants`);
          roomsToDelete.push(roomId);
        }
      });

      if (roomsToDelete.length === 0) {
        console.log('No orphaned rooms to clean up');
        return;
      }

      console.log(`Found ${roomsToDelete.length} orphaned rooms to delete`);

      // Delete the orphaned rooms
      const { error: deleteError } = await supabase
        .from('chat_rooms')
        .delete()
        .in('id', roomsToDelete);

      if (deleteError) {
        console.error('Error deleting orphaned rooms:', deleteError);
        return;
      }

      console.log(`Successfully cleaned up ${roomsToDelete.length} orphaned direct message rooms`);
    } catch (error) {
      console.error('Error during cleanup:', error);
      throw new ChatServiceError(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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

    console.log('Creating direct message room with user:', otherUserId);

    // Step 1: Check if a direct message room already exists between these users
    const { data: existingRooms, error: existingError } = await supabase
      .from('chat_rooms')
      .select(`
        id,
        name,
        created_at,
        chat_participants!inner(user_id)
      `)
      .eq('is_direct_message', true)
      .eq('chat_participants.user_id', user.id);

    if (existingError) throw new ChatServiceError(`Failed to check existing rooms: ${existingError.message}`);

    // Step 2: Check if any of these rooms also have the other user as a participant
    if (existingRooms && existingRooms.length > 0) {
      for (const room of existingRooms) {
        const { data: otherParticipant, error: participantError } = await supabase
          .from('chat_participants')
          .select('user_id')
          .eq('room_id', room.id)
          .eq('user_id', otherUserId)
          .single();

        if (!participantError && otherParticipant) {
          // Found an existing room with both users - return it
          console.log('Found existing direct message room:', room.id);
          
          // Get the room with full details
          const { data: fullRoom, error: fullRoomError } = await supabase
            .from('chat_rooms')
            .select('*')
            .eq('id', room.id)
            .single();

          if (fullRoomError) throw new ChatServiceError(`Failed to get room details: ${fullRoomError.message}`);

          // Get participants for this room
          const { data: participants } = await supabase
            .from('chat_participants')
            .select('user_id')
            .eq('room_id', room.id);

          if (!participants) return { ...fullRoom, chat_participants: [], participants: [], isGroup: false };

          // Get profiles for all participants
          const participantIds = participants.map(p => p.user_id);
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, role')
            .in('id', participantIds);

          if (profilesError) throw new ChatServiceError(`Failed to get profiles: ${profilesError.message}`);

          // Combine the data
          const chatParticipants = participants.map(participant => ({
            user_id: participant.user_id,
            room_id: room.id,
            joined_at: new Date().toISOString(),
            id: participant.user_id,
            profiles: profiles?.find(p => p.id === participant.user_id) || null
          }));

          return {
            ...fullRoom,
            chat_participants: chatParticipants,
            participants: chatParticipants,
            isGroup: false
          };
        }
      }
    }

    // Step 3: If no existing room found, create a new one
    console.log('Creating new direct message room with user:', otherUserId);
    
    // Get the other user's username for the room name
    const { data: otherUserProfile, error: profileError } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', otherUserId)
      .single();

    if (profileError) throw new ChatServiceError(`Failed to get user profile: ${profileError.message}`);
    if (!otherUserProfile) throw new ChatServiceError('User not found');

    console.log('Other user profile:', otherUserProfile);

    // Create the new room using the stored procedure - always use the other user's username
    const { data: newRoom, error: createError } = await supabase
      .rpc('create_direct_message_room', {
        other_user_id: otherUserId,
        room_name: otherUserProfile.username // Always use the other user's username
      });

    if (createError) throw new ChatServiceError(`Failed to create room: ${createError.message}`);
    if (!newRoom) throw new ChatServiceError('No room created');

    console.log('New room created:', newRoom);
    console.log('Room name should be:', otherUserProfile.username);

    // Verify that both participants were added correctly
    const { data: participants, error: participantsError } = await supabase
      .from('chat_participants')
      .select('user_id')
      .eq('room_id', newRoom.id);

    if (participantsError) throw new ChatServiceError(`Failed to verify participants: ${participantsError.message}`);

    console.log('Room participants:', participants);

    // Check if both users are participants
    const participantIds = participants?.map(p => p.user_id) || [];
    const hasCurrentUser = participantIds.includes(user.id);
    const hasOtherUser = participantIds.includes(otherUserId);

    if (!hasCurrentUser || !hasOtherUser) {
      console.warn('Room created but missing participants. Attempting to fix...');
      
      // Add missing participants
      if (!hasCurrentUser) {
        await this.addParticipant(newRoom.id, user.id);
        console.log('Added current user as participant');
      }
      
      if (!hasOtherUser) {
        await this.addParticipant(newRoom.id, otherUserId);
        console.log('Added other user as participant');
      }
    }

    // Get the final room with participants
    const { data: finalParticipants } = await supabase
      .from('chat_participants')
      .select('user_id')
      .eq('room_id', newRoom.id);

    if (!finalParticipants) return { ...newRoom, chat_participants: [], participants: [], isGroup: false };

    // Get profiles for all participants
    const finalParticipantIds = finalParticipants.map(p => p.user_id);
    const { data: finalProfiles, error: finalProfilesError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, role')
      .in('id', finalParticipantIds);

    if (finalProfilesError) throw new ChatServiceError(`Failed to get final profiles: ${finalProfilesError.message}`);

    // Combine the data
    const finalChatParticipants = finalParticipants.map(participant => ({
      user_id: participant.user_id,
      room_id: newRoom.id,
      joined_at: new Date().toISOString(),
      id: participant.user_id,
      profiles: finalProfiles?.find(p => p.id === participant.user_id) || null
    }));

    console.log('Final room with participants:', {
      roomId: newRoom.id,
      roomName: newRoom.name,
      participants: finalChatParticipants.map(p => p.profiles?.username)
    });

    return {
      ...newRoom,
      chat_participants: finalChatParticipants,
      participants: finalChatParticipants,
      isGroup: false
    };
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

  // Debug function to test message sending
  async testMessageSending(roomId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ChatServiceError('User not authenticated');

    console.log('🧪 Testing message sending...');
    console.log('User:', user.id);
    console.log('Room:', roomId);

    try {
      // Test 1: Check if user is participant in the room
      const { data: participant, error: participantError } = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .single();

      console.log('Participant check:', { participant, error: participantError });

      // Test 2: Try to insert a test message
      const { data: message, error: messageError } = await supabase
        .from('chat_messages')
        .insert([
          {
            room_id: roomId,
            content: 'Test message ' + new Date().toISOString(),
            sender_id: user.id,
          },
        ])
        .select()
        .single();

      console.log('Message insert test:', { message, error: messageError });

      if (messageError) {
        console.error('❌ Message sending failed:', messageError);
        throw new ChatServiceError(`Message sending failed: ${messageError.message}`);
      } else {
        console.log('✅ Message sending test successful:', message);
      }

    } catch (error) {
      console.error('❌ Test failed:', error);
      throw error;
    }
  },

  // Fast message sending without waiting for database response
  async sendMessageFast(roomId: string, content: string): Promise<void> {
    console.log('sendMessageFast called with:', { roomId, content });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('User not authenticated in sendMessageFast');
      throw new ChatServiceError('User not authenticated');
    }

    console.log('User authenticated:', { userId: user.id, email: user.email });

    try {
      // Send message to database
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
        .single();

      if (error) {
        console.error('Failed to save message:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw new ChatServiceError(`Failed to save message: ${error.message}`);
      } else {
        console.log('Message saved successfully:', data);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      throw new ChatServiceError(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async deleteMessage(messageId: string): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('delete_message', { message_id: messageId });

    if (error) throw new ChatServiceError(`Failed to delete message: ${error.message}`);
    return !!data;
  },

  async getMessages(roomId: string): Promise<ChatMessage[]> {
    try {
      // First, ensure the user is a participant in this room
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new ChatServiceError('User not authenticated');

      // Check if user is a participant in this room
      const { data: participant, error: participantError } = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .single();

      if (participantError && participantError.code !== 'PGRST116') {
        console.error('Error checking participant status:', participantError);
      }

      // If user is not a participant, add them (this might be needed for direct messages)
      if (!participant) {
        console.log('User not a participant in room, attempting to add them...');
        try {
          await this.addParticipant(roomId, user.id);
        } catch (addError) {
          console.error('Failed to add user as participant:', addError);
          // Continue anyway, the RLS policy might still allow access
        }
      }

      // Get blocked users
      const { data: blockedUsers, error: blockError } = await supabase
        .from('blocked_users')
        .select('blocked_id')
        .returns<{ blocked_id: string }[]>();
      
      if (blockError) throw blockError;
      
      const blockedIds = blockedUsers?.map(bu => bu.blocked_id) || [];

      // Get messages with reactions - use a different approach to avoid foreign key issues
      console.log('Fetching messages for room:', roomId);
      
      // First, get the messages
      const { data: messages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .returns<ChatMessage[]>();

      if (messagesError) {
        console.error('Messages query error:', messagesError);
        console.error('Error details:', {
          code: messagesError.code,
          message: messagesError.message,
          details: messagesError.details,
          hint: messagesError.hint
        });
        throw messagesError;
      }

      // Then, get the profiles for all sender IDs
      const senderIds = messages?.map(m => m.sender_id) || [];
      let profiles: { [key: string]: { username: string; avatar_url: string | null } } = {};
      
      if (senderIds.length > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', senderIds);

        if (profileError) {
          console.error('Profile query error:', profileError);
        } else {
          // Create a map of user ID to profile data
          profiles = profileData?.reduce((acc, profile) => {
            acc[profile.id] = {
              username: profile.username,
              avatar_url: profile.avatar_url
            };
            return acc;
          }, {} as { [key: string]: { username: string; avatar_url: string | null } }) || {};
        }
      }

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

      // Combine messages with their profiles and reactions
      const messagesWithReactions = messages?.map(message => {
        const messageReactions = Object.entries(reactionCounts)
          .filter(([key]) => key.startsWith(message.id))
          .map(([key, count]) => ({
            reaction: key.split('-')[1],
            count
          }));

        return {
          ...message,
          profiles: profiles[message.sender_id] || {
            username: 'Unknown User',
            avatar_url: null
          },
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
              let profile = _getCachedProfile(payload.new.sender_id);
              
              if (!profile) {
                // Fetch profile only if not cached
                const { data: profileData, error: profileError } = await supabase
                  .from('profiles')
                  .select('username, avatar_url')
                  .eq('id', payload.new.sender_id)
                  .single();

                if (!profileError && profileData) {
                  profile = profileData;
                  _cacheProfile(payload.new.sender_id, profile);
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
  async sendMessageBatched(roomId: string, content: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ChatServiceError('User not authenticated');

    // Add message to batch
    _messageBatch.push({ roomId, content, userId: user.id });

    // Start batch timer if not already running
    if (!_batchTimer) {
      _batchTimer = setTimeout(() => {
        _flushMessageBatch();
      }, BATCH_DELAY);
    }
  },

  // Force flush any remaining messages
  async flushMessageBatch(): Promise<void> {
    if (_batchTimer) {
      clearTimeout(_batchTimer);
      _batchTimer = null;
    }
    await _flushMessageBatch();
  }
}; 