const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');
const { createServer } = require('http');

// Add debug logging
console.log('🚀 Initializing WebSocket Chat Server...');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    },
    global: {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }
  }
);

// Rate limiting configuration
const RATE_LIMIT = {
  messages: {
    windowMs: 60000, // 1 minute
    maxRequests: 120, // 120 messages per minute
  },
  connections: {
    windowMs: 60000, // 1 minute
    maxRequests: 60, // 60 connection attempts per minute
  },
};

// Store active connections and room data
const connections = new Map(); // ws -> { userId, rooms, lastSeen }
const rooms = new Map(); // roomId -> Set of ws connections
const userConnections = new Map(); // userId -> Set of ws connections
const typingUsers = new Map(); // roomId -> Map of userId -> typing data
const messageReactions = new Map(); // messageId -> Map of reaction -> count

// Rate limiting
const connectionLimiter = new Map();
const messageLimiter = new Map();

// Create HTTP server
const server = createServer();
const wss = new WebSocket.Server({ server });

// Utility functions
function getRateLimitKey(ip) {
  return `${ip}-${Math.floor(Date.now() / RATE_LIMIT.messages.windowMs)}`;
}

function isRateLimited(limiter, ip, limit) {
  const key = getRateLimitKey(ip);
  const count = limiter.get(key) || 0;
  
  if (count >= limit.maxRequests) {
    return true;
  }
  
  limiter.set(key, count + 1);
  
  // Clean up old entries
  setTimeout(() => {
    limiter.delete(key);
  }, limit.windowMs);
  
  return false;
}

function heartbeat(ws) {
  ws.isAlive = true;
  if (connections.has(ws)) {
    connections.get(ws).lastSeen = Date.now();
  }
}

function noop() {}

const checkConnections = () => {
  wss.clients.forEach(ws => {
    if (ws.isAlive === false) {
      console.log('Client connection terminated due to inactivity');
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping(noop);
  });
};

// Run health checks every 30 seconds
const healthCheckInterval = setInterval(checkConnections, 30000);

wss.on('close', function close() {
  clearInterval(healthCheckInterval);
});

// Message handling functions
async function handleJoinRoom(ws, message) {
  const { roomId, userId } = message;
  
  if (!roomId || !userId) {
    sendError(ws, 'Missing roomId or userId');
    return;
  }

  // Add user to room
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  rooms.get(roomId).add(ws);

  // Update connection info
  if (!connections.has(ws)) {
    connections.set(ws, { userId, rooms: new Set(), lastSeen: Date.now() });
  }
  connections.get(ws).rooms.add(roomId);

  // Track user connections
  if (!userConnections.has(userId)) {
    userConnections.set(userId, new Set());
  }
  userConnections.get(userId).add(ws);

  // Notify other users in the room
  broadcastToRoom(roomId, {
    type: 'join',
    roomId,
    data: { userId },
    timestamp: Date.now()
  }, ws);

  console.log(`👤 User ${userId} joined room ${roomId}`);
}

async function handleLeaveRoom(ws, message) {
  const { roomId, userId } = message;
  
  if (!roomId || !userId) {
    sendError(ws, 'Missing roomId or userId');
        return;
      }

  // Remove user from room
  if (rooms.has(roomId)) {
    rooms.get(roomId).delete(ws);
    if (rooms.get(roomId).size === 0) {
      rooms.delete(roomId);
    }
  }

  // Update connection info
  if (connections.has(ws)) {
    connections.get(ws).rooms.delete(roomId);
  }

  // Notify other users in the room
  broadcastToRoom(roomId, {
    type: 'leave',
    roomId,
    data: { userId },
    timestamp: Date.now()
  }, ws);

  console.log(`👤 User ${userId} left room ${roomId}`);
}

async function handleChatMessage(ws, message) {
  const { roomId, data } = message;
  const { content, senderId, attachments } = data;
  
  if (!roomId || !content || !senderId) {
    sendError(ws, 'Missing required message data');
    return;
  }

  try {
    // Save message to database
    const { data: savedMessage, error } = await supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        sender_id: senderId,
        content,
        attachments: attachments || [],
        created_at: new Date().toISOString()
      })
      .select(`
        *,
        profiles:profiles(username, avatar_url)
      `)
      .single();

    if (error) {
      console.error('Error saving message:', error);
      sendError(ws, 'Failed to save message');
      return;
    }

    // Broadcast message to all users in the room
    const chatMessage = {
      type: 'message',
      roomId,
      data: savedMessage,
      timestamp: Date.now()
    };

    broadcastToRoom(roomId, chatMessage);

    console.log(`💬 Message sent in room ${roomId} by user ${senderId}`);
    
  } catch (error) {
    console.error('Error handling chat message:', error);
    sendError(ws, 'Internal server error');
  }
}

async function handleTypingIndicator(ws, message) {
  const { roomId, data } = message;
  const { userId, isTyping } = data;
  
    if (!roomId || !userId) {
    sendError(ws, 'Missing roomId or userId');
    return;
  }

  // Update typing status
  if (!typingUsers.has(roomId)) {
    typingUsers.set(roomId, new Map());
  }

  if (isTyping) {
    typingUsers.get(roomId).set(userId, {
      timestamp: Date.now(),
      isTyping: true
    });
  } else {
    typingUsers.get(roomId).delete(userId);
  }

  // Broadcast typing indicator to other users in the room
  broadcastToRoom(roomId, {
    type: 'typing',
    roomId,
    data: { userId, isTyping },
    timestamp: Date.now()
  }, ws);

  // Clean up typing indicator after 5 seconds
  if (isTyping) {
    setTimeout(() => {
      if (typingUsers.has(roomId) && typingUsers.get(roomId).has(userId)) {
        typingUsers.get(roomId).delete(userId);
        broadcastToRoom(roomId, {
          type: 'typing',
          roomId,
          data: { userId, isTyping: false },
          timestamp: Date.now()
        });
      }
    }, 5000);
  }
}

async function handleMessageReaction(ws, message) {
  const { roomId, data } = message;
  const { messageId, userId, reaction } = data;
  
  if (!roomId || !messageId || !userId || !reaction) {
    sendError(ws, 'Missing reaction data');
    return;
  }

  try {
    // Save reaction to database
    const { error } = await supabase
      .from('message_reactions')
      .upsert({
        message_id: messageId,
        user_id: userId,
        reaction,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'message_id,user_id,reaction'
      });

    if (error) {
      console.error('Error saving reaction:', error);
      sendError(ws, 'Failed to save reaction');
      return;
    }

    // Get reaction count
    const { count } = await supabase
      .from('message_reactions')
      .select('*', { count: 'exact' })
      .eq('message_id', messageId)
      .eq('reaction', reaction);

    // Broadcast reaction to all users in the room
    broadcastToRoom(roomId, {
      type: 'reaction',
      roomId,
      data: { messageId, reaction, count: count || 0 },
      timestamp: Date.now()
    });

    console.log(`👍 Reaction ${reaction} added to message ${messageId} by user ${userId}`);
    
  } catch (error) {
    console.error('Error handling message reaction:', error);
    sendError(ws, 'Internal server error');
  }
}

async function handlePresenceUpdate(ws, message) {
  const { roomId, data } = message;
  const { userId, status } = data;
  
  if (!roomId || !userId || !status) {
    sendError(ws, 'Missing presence data');
    return;
  }

  // Broadcast presence update to other users in the room
  broadcastToRoom(roomId, {
    type: 'presence',
    roomId,
    data: { userId, status, lastSeen: Date.now() },
    timestamp: Date.now()
  }, ws);

  console.log(`👤 User ${userId} presence updated to ${status} in room ${roomId}`);
}

// Broadcasting functions
function broadcastToRoom(roomId, message, excludeWs = null) {
  if (!rooms.has(roomId)) return;

  const roomConnections = rooms.get(roomId);
  roomConnections.forEach(ws => {
    if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error broadcasting message:', error);
      }
    }
  });
}

function sendError(ws, error) {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify({
        type: 'error',
        data: { error },
        timestamp: Date.now()
      }));
    } catch (err) {
      console.error('Error sending error message:', err);
    }
  }
}

function sendPong(ws) {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify({
        type: 'pong',
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error sending pong:', error);
    }
  }
}

// Cleanup functions
function cleanupConnection(ws) {
  const connection = connections.get(ws);
  if (!connection) return;

  const { userId, rooms: userRooms } = connection;

  // Remove from all rooms
  userRooms.forEach(roomId => {
    if (rooms.has(roomId)) {
      rooms.get(roomId).delete(ws);
      if (rooms.get(roomId).size === 0) {
        rooms.delete(roomId);
      }
    }

    // Notify other users
    broadcastToRoom(roomId, {
      type: 'leave',
      roomId,
      data: { userId },
      timestamp: Date.now()
    });
  });

  // Remove from user connections
  if (userConnections.has(userId)) {
    userConnections.get(userId).delete(ws);
    if (userConnections.get(userId).size === 0) {
      userConnections.delete(userId);
    }
  }

  // Clean up typing indicators
  typingUsers.forEach((userMap, roomId) => {
    if (userMap.has(userId)) {
      userMap.delete(userId);
      broadcastToRoom(roomId, {
        type: 'typing',
        roomId,
        data: { userId, isTyping: false },
        timestamp: Date.now()
      });
    }
  });

  connections.delete(ws);
  console.log(`🔌 Connection cleaned up for user ${userId}`);
}

// WebSocket connection handling
wss.on('connection', async (ws, req) => {
  console.log('🔌 New WebSocket connection');

  // Rate limiting
  const ip = req.socket.remoteAddress;
  if (isRateLimited(connectionLimiter, ip, RATE_LIMIT.connections)) {
    console.log('Rate limit exceeded for connection');
    ws.close(1008, 'Rate limit exceeded');
    return;
  }

  // Set up connection
  ws.isAlive = true;
  ws.on('pong', heartbeat);

  // Handle incoming messages
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      
      // Rate limiting for messages
      if (isRateLimited(messageLimiter, ip, RATE_LIMIT.messages)) {
        sendError(ws, 'Rate limit exceeded');
        return;
      }

      switch (message.type) {
        case 'ping':
          sendPong(ws);
          break;

        case 'join':
          await handleJoinRoom(ws, message);
          break;

        case 'leave':
          await handleLeaveRoom(ws, message);
          break;

        case 'message':
          await handleChatMessage(ws, message);
          break;

        case 'typing':
          await handleTypingIndicator(ws, message);
          break;

        case 'reaction':
          await handleMessageReaction(ws, message);
          break;

        case 'presence':
          await handlePresenceUpdate(ws, message);
          break;

        default:
          console.warn('Unknown message type:', message.type);
          sendError(ws, 'Unknown message type');
      }

    } catch (error) {
      console.error('Error handling message:', error);
      sendError(ws, 'Invalid message format');
    }
  });

  // Handle connection close
  ws.on('close', (code, reason) => {
    console.log(`🔌 WebSocket connection closed: ${code} - ${reason}`);
    cleanupConnection(ws);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    cleanupConnection(ws);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down WebSocket server...');
  wss.close(() => {
    console.log('✅ WebSocket server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Shutting down WebSocket server...');
  wss.close(() => {
    console.log('✅ WebSocket server closed');
    process.exit(0);
  });
}); 

// Start server
const PORT = process.env.WS_PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 WebSocket Chat Server running on port ${PORT}`);
  console.log(`📊 Active connections: ${wss.clients.size}`);
  console.log(`🏠 Active rooms: ${rooms.size}`);
  console.log(`👥 Connected users: ${userConnections.size}`);
});

// Log server stats periodically
setInterval(() => {
  console.log(`📊 Server Stats - Connections: ${wss.clients.size}, Rooms: ${rooms.size}, Users: ${userConnections.size}`);
}, 60000); // Every minute 