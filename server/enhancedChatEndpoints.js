// Enhanced chat endpoints for improved real-time functionality
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
let supabase = null;

const getSupabaseClient = () => {
  if (!supabase) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables for enhanced chat');
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabase;
};

// Enhanced conversation endpoint with participant data
const getConversationsWithParticipants = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Validate userId
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    console.log('Fetching enhanced conversations for user:', userId);
    
    const supabaseClient = getSupabaseClient();
    
    // Get conversations
    const { data: conversations, error: convError } = await supabaseClient
      .from('chat_conversations')
      .select('*')
      .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
      .order('last_message_at', { ascending: false });

    if (convError) {
      console.error('Error fetching conversations:', convError);
      throw convError;
    }

    // Enhance with participant data and unread counts
    const enhancedConversations = await Promise.all(
      conversations.map(async (conv) => {
        // Get participants
        const { data: participants, error: partError } = await supabaseClient
          .from('chat_participants')
          .select('user_id, last_read_at')
          .eq('conversation_id', conv.id);

        if (partError) {
          console.error('Error fetching participants:', partError);
        }

        // Get profiles for participants
        let participantProfiles = {};
        if (participants && participants.length > 0) {
          const userIds = participants.map(p => p.user_id);
          const { data: profiles, error: profileError } = await supabaseClient
            .from('profiles')
            .select('id, username, avatar_url, is_banned')
            .in('id', userIds);
          
          if (!profileError && profiles) {
            participantProfiles = profiles.reduce((acc, profile) => {
              acc[profile.id] = profile;
              return acc;
            }, {});
          }
        }

        // Get unread count
        const { count: unreadCount, error: unreadError } = await supabaseClient
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .gt('created_at', participants?.find(p => p.user_id === userId)?.last_read_at || '1970-01-01')
          .neq('sender_id', userId);

        if (unreadError) {
          console.error('Error fetching unread count:', unreadError);
        }

        // Get last message
        const { data: lastMessage, error: msgError } = await supabaseClient
          .from('chat_messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (msgError && msgError.code !== 'PGRST116') {
          console.error('Error fetching last message:', msgError);
        }

        return {
          ...conv,
          participants: participants?.map(p => ({
            id: p.user_id,
            username: participantProfiles[p.user_id]?.username || 'Unknown User',
            avatar_url: participantProfiles[p.user_id]?.avatar_url || null,
            is_banned: participantProfiles[p.user_id]?.is_banned || false,
            last_read_at: p.last_read_at
          })) || [],
          unread_count: unreadCount || 0,
          last_message: lastMessage || null
        };
      })
    );

    res.json(enhancedConversations);
  } catch (error) {
    console.error('Error in getConversationsWithParticipants:', error);
    res.status(500).json({ error: 'Failed to fetch conversations', details: error.message });
  }
};

// Get conversation participants
const getConversationParticipants = async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    const supabaseClient = getSupabaseClient();
    
    // First get the participants
    const { data: participants, error } = await supabaseClient
      .from('chat_participants')
      .select('user_id, last_read_at')
      .eq('conversation_id', conversationId);

    if (error) {
      console.error('Error fetching participants:', error);
      throw error;
    }

    if (!participants || participants.length === 0) {
      return res.json([]);
    }

    // Get user profiles for all participants
    const userIds = participants.map(p => p.user_id);
    const { data: profiles, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, username, avatar_url, is_banned')
      .in('id', userIds);

    if (profileError) {
      console.error('Error fetching profiles:', profileError);
    }

    // Create a map of profiles for easy lookup
    const profileMap = {};
    if (profiles) {
      profiles.forEach(profile => {
        profileMap[profile.id] = profile;
      });
    }

    // Combine participants with their profile data
    const participantsWithProfiles = participants.map(p => ({
      id: p.user_id,
      username: profileMap[p.user_id]?.username || 'Unknown User',
      avatar_url: profileMap[p.user_id]?.avatar_url || null,
      is_banned: profileMap[p.user_id]?.is_banned || false,
      last_read_at: p.last_read_at
    }));

    res.json(participantsWithProfiles);
  } catch (error) {
    console.error('Error in getConversationParticipants:', error);
    res.status(500).json({ error: 'Failed to fetch participants', details: error.message });
  }
};

// Get messages with pagination
const getMessagesWithPagination = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const supabaseClient = getSupabaseClient();
    const { data, error } = await supabaseClient
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }

    // Get sender profiles for all messages
    const senderIds = [...new Set(data?.map(msg => msg.sender_id) || [])];
    let senderProfiles = {};
    
    if (senderIds.length > 0) {
      const { data: profiles, error: profileError } = await supabaseClient
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', senderIds);
      
      if (!profileError && profiles) {
        senderProfiles = profiles.reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {});
      }
    }

    // Transform messages to include sender data
    const messages = data?.map(msg => ({
      ...msg,
      sender: senderProfiles[msg.sender_id] || {
        id: msg.sender_id,
        username: 'Unknown User',
        avatar_url: null
      }
    })) || [];

    res.json(messages);
  } catch (error) {
    console.error('Error in getMessagesWithPagination:', error);
    res.status(500).json({ error: 'Failed to fetch messages', details: error.message });
  }
};

// Send message with enhanced validation
const sendMessage = async (req, res) => {
  try {
    const { conversation_id, content, message_type = 'text', metadata = {}, sender_id } = req.body;
    
    // Enhanced validation
    if (!conversation_id || typeof conversation_id !== 'string') {
      return res.status(400).json({ error: 'conversation_id is required and must be a string' });
    }
    
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'content is required and cannot be empty' });
    }
    
    if (!sender_id || typeof sender_id !== 'string') {
      return res.status(400).json({ error: 'sender_id is required and must be a string' });
    }

    // Validate message type
    const validTypes = ['text', 'image', 'file', 'location'];
    if (!validTypes.includes(message_type)) {
      return res.status(400).json({ error: 'Invalid message type' });
    }

    // Validate content length
    if (content.length > 10000) {
      return res.status(400).json({ error: 'Message content too long (max 10000 characters)' });
    }

    const supabaseClient = getSupabaseClient();

    // Check if conversation exists and user is participant
    const { data: conversation, error: convError } = await supabaseClient
      .from('chat_conversations')
      .select('*')
      .eq('id', conversation_id)
      .single();

    if (convError || !conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Insert message
    const { data: message, error: msgError } = await supabaseClient
      .from('chat_messages')
      .insert([{
        conversation_id,
        content,
        message_type,
        metadata,
        sender_id
      }])
      .select(`
        *,
        sender:profiles!sender_id(id, username, avatar_url)
      `)
      .single();

    if (msgError) {
      console.error('Error inserting message:', msgError);
      throw msgError;
    }

    // Update conversation timestamp
    await supabaseClient
      .from('chat_conversations')
      .update({ 
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', conversation_id);

    // Transform message to include sender data
    const transformedMessage = {
      ...message,
      sender: message.profiles ? {
        id: message.profiles.id,
        username: message.profiles.username,
        avatar_url: message.profiles.avatar_url
      } : null
    };

    res.json(transformedMessage);
  } catch (error) {
    console.error('Error in sendMessage:', error);
    res.status(500).json({ error: 'Failed to send message', details: error.message });
  }
};

// Mark conversation as read
const markConversationAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { user_id } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const supabaseClient = getSupabaseClient();

    // Update last_read_at for the user in this conversation
    const { error } = await supabaseClient
      .from('chat_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', user_id);

    if (error) {
      console.error('Error marking conversation as read:', error);
      throw error;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error in markConversationAsRead:', error);
    res.status(500).json({ error: 'Failed to mark conversation as read', details: error.message });
  }
};

// Get unread count for conversation
const getUnreadCount = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { user_id } = req.query;
    
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const supabaseClient = getSupabaseClient();

    // Get user's last read time for this conversation
    const { data: participant, error: partError } = await supabaseClient
      .from('chat_participants')
      .select('last_read_at')
      .eq('conversation_id', conversationId)
      .eq('user_id', user_id)
      .single();

    if (partError) {
      console.error('Error fetching participant:', partError);
    }

    const lastReadAt = participant?.last_read_at || '1970-01-01';

    // Count unread messages
    const { count, error: countError } = await supabaseClient
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .gt('created_at', lastReadAt)
      .neq('sender_id', user_id);

    if (countError) {
      console.error('Error counting unread messages:', countError);
      throw countError;
    }

    res.json({ count: count || 0 });
  } catch (error) {
    console.error('Error in getUnreadCount:', error);
    res.status(500).json({ error: 'Failed to get unread count', details: error.message });
  }
};

// Get total unread count for user
const getTotalUnreadCount = async (req, res) => {
  try {
    const { user_id } = req.query;
    
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const supabaseClient = getSupabaseClient();

    // Get all conversations for user
    const { data: conversations, error: convError } = await supabaseClient
      .from('chat_conversations')
      .select('id')
      .or(`participant1_id.eq.${user_id},participant2_id.eq.${user_id}`);

    if (convError) {
      console.error('Error fetching conversations:', convError);
      throw convError;
    }

    const conversationIds = conversations?.map(c => c.id) || [];

    if (conversationIds.length === 0) {
      return res.json({ count: 0 });
    }

    // Get last read times for all conversations
    const { data: participants, error: partError } = await supabaseClient
      .from('chat_participants')
      .select('conversation_id, last_read_at')
      .in('conversation_id', conversationIds)
      .eq('user_id', user_id);

    if (partError) {
      console.error('Error fetching participants:', partError);
    }

    const lastReadTimes = new Map();
    participants?.forEach(p => {
      lastReadTimes.set(p.conversation_id, p.last_read_at || '1970-01-01');
    });

    // Count unread messages across all conversations
    let totalUnread = 0;
    
    for (const convId of conversationIds) {
      const lastReadAt = lastReadTimes.get(convId) || '1970-01-01';
      
      const { count, error: countError } = await supabaseClient
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', convId)
        .gt('created_at', lastReadAt)
        .neq('sender_id', user_id);

      if (countError) {
        console.error('Error counting unread messages for conversation', convId, ':', countError);
        continue;
      }

      totalUnread += count || 0;
    }

    res.json({ count: totalUnread });
  } catch (error) {
    console.error('Error in getTotalUnreadCount:', error);
    res.status(500).json({ error: 'Failed to get total unread count', details: error.message });
  }
};

// Search conversations
const searchConversations = async (req, res) => {
  try {
    const { user_id, q } = req.query;
    
    if (!user_id || !q) {
      return res.status(400).json({ error: 'user_id and q are required' });
    }

    const supabaseClient = getSupabaseClient();

    // Get user's conversations
    const { data: conversations, error: convError } = await supabaseClient
      .from('chat_conversations')
      .select('*')
      .or(`participant1_id.eq.${user_id},participant2_id.eq.${user_id}`);

    if (convError) {
      console.error('Error fetching conversations:', convError);
      throw convError;
    }

    // Get participants for all conversations
    const conversationIds = conversations?.map(c => c.id) || [];
    
    if (conversationIds.length === 0) {
      return res.json([]);
    }

    const { data: participants, error: partError } = await supabaseClient
      .from('chat_participants')
      .select('conversation_id, user_id')
      .in('conversation_id', conversationIds);

    if (partError) {
      console.error('Error fetching participants:', partError);
    }

    // Get profiles for all participants
    const userIds = [...new Set(participants?.map(p => p.user_id) || [])];
    let participantProfiles = {};
    
    if (userIds.length > 0) {
      const { data: profiles, error: profileError } = await supabaseClient
        .from('profiles')
        .select('id, username, avatar_url, is_banned')
        .in('id', userIds);
      
      if (!profileError && profiles) {
        participantProfiles = profiles.reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {});
      }
    }

    // Filter conversations by search query
    const searchQuery = q.toLowerCase();
    const filteredConversations = conversations?.filter(conv => {
      const convParticipants = participants?.filter(p => p.conversation_id === conv.id) || [];
      return convParticipants.some(p => {
        const profile = participantProfiles[p.user_id];
        return profile?.username?.toLowerCase().includes(searchQuery);
      });
    }) || [];

    // Enhance with participant data
    const enhancedConversations = filteredConversations.map(conv => {
      const convParticipants = participants?.filter(p => p.conversation_id === conv.id) || [];
      return {
        ...conv,
        participants: convParticipants.map(p => {
          const profile = participantProfiles[p.user_id];
          return {
            id: p.user_id,
            username: profile?.username || 'Unknown User',
            avatar_url: profile?.avatar_url || null,
            is_banned: profile?.is_banned || false
          };
        })
      };
    });

    res.json(enhancedConversations);
  } catch (error) {
    console.error('Error in searchConversations:', error);
    res.status(500).json({ error: 'Failed to search conversations', details: error.message });
  }
};

// Get conversation details
const getConversationDetails = async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    const supabaseClient = getSupabaseClient();
    const { data: conversation, error: convError } = await supabaseClient
      .from('chat_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Get participants
    const { data: participants, error: partError } = await supabaseClient
      .from('chat_participants')
      .select('user_id, last_read_at')
      .eq('conversation_id', conversationId);

    if (partError) {
      console.error('Error fetching participants:', partError);
    }

    // Get profiles for participants
    let participantProfiles = {};
    if (participants && participants.length > 0) {
      const userIds = participants.map(p => p.user_id);
      const { data: profiles, error: profileError } = await supabaseClient
        .from('profiles')
        .select('id, username, avatar_url, is_banned')
        .in('id', userIds);
      
      if (!profileError && profiles) {
        participantProfiles = profiles.reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {});
      }
    }

    const enhancedConversation = {
      ...conversation,
      participants: participants?.map(p => ({
        id: p.user_id,
        username: participantProfiles[p.user_id]?.username || 'Unknown User',
        avatar_url: participantProfiles[p.user_id]?.avatar_url || null,
        is_banned: participantProfiles[p.user_id]?.is_banned || false,
        last_read_at: p.last_read_at
      })) || []
    };

    res.json(enhancedConversation);
  } catch (error) {
    console.error('Error in getConversationDetails:', error);
    res.status(500).json({ error: 'Failed to get conversation details', details: error.message });
  }
};

export {
  getConversationsWithParticipants,
  getConversationParticipants,
  getMessagesWithPagination,
  sendMessage,
  markConversationAsRead,
  getUnreadCount,
  getTotalUnreadCount,
  searchConversations,
  getConversationDetails
};