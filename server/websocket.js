const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');
const { createServer } = require('http');

// Add debug logging
console.log('Initializing WebSocket server...');

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

// Store active connections with metadata
const connections = new Map();
const connectionLimiter = new Map();
const messageLimiter = new Map();

// Connection pooling and optimization
const connectionPool = new Map();
const messageQueue = new Map(); // Per-room message queue
const BATCH_INTERVAL = 16; // ~60fps for smooth real-time updates

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

// Optimize connection handling
wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  
  // Check connection rate limit
  if (isRateLimited(connectionLimiter, ip, RATE_LIMIT.connections)) {
    console.warn(`Connection rate limit exceeded for IP: ${ip}`);
    ws.send(JSON.stringify({
      type: 'error',
      data: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many connection attempts. Please try again later.',
      },
    }));
    return ws.close(1008, 'Rate limit exceeded');
  }

  console.log('New client connected from:', ip);
  
  // Setup connection tracking with optimized metadata
  ws.isAlive = true;
  ws.ip = ip;
  ws.connectionTime = Date.now(); // Use timestamp instead of Date object
  ws.messageCount = 0;
  ws.lastPing = Date.now();
  
  // Optimize heartbeat handling
  ws.on('pong', () => {
    ws.lastPing = Date.now();
    heartbeat(ws);
  });
  
  ws.on('ping', () => {
    ws.lastPing = Date.now();
    ws.pong();
  });

  // Handle incoming messages with reduced overhead
  ws.on('message', async (message) => {
    try {
      // Check message rate limit
      if (isRateLimited(messageLimiter, ip, RATE_LIMIT.messages)) {
        throw new Error('Message rate limit exceeded');
      }

      // Handle heartbeat messages efficiently
      if (message.toString() === 'ping') {
        ws.lastPing = Date.now();
        ws.send('pong');
        return;
      }

      // Parse and validate message with size check first
      const messageSize = message.length;
      if (messageSize > 1024 * 1024) { // 1MB limit
        throw new Error('Message size exceeds limit');
      }

      let parsedMessage;
      try {
        parsedMessage = JSON.parse(message);
      } catch (e) {
        throw new Error('Invalid message format: not valid JSON');
      }

      const { type, data } = parsedMessage;

      if (!type || !data) {
        throw new Error('Invalid message format: missing type or data');
      }

      // Process message immediately without extra logging
      switch (type) {
        case 'message':
          await handleMessage(ws, data);
          break;
        case 'typing':
          handleTyping(ws, data);
          break;
        case 'reaction':
          await handleReaction(ws, data);
          break;
        case 'message_update':
          await handleMessageUpdate(ws, data);
          break;
        case 'message_delete':
          await handleMessageDelete(ws, data);
          break;
        case 'REPORT_CREATED':
          await handleReportCreated(ws, data);
          break;
        case 'REPORT_UPDATED':
          await handleReportUpdated(ws, data);
          break;
        default:
          throw new Error(`Unsupported message type: ${type}`);
      }

      // Update message count
      ws.messageCount++;

    } catch (error) {
      console.error('Error processing message:', error);
      // Send error response only for critical errors
      if (error.message.includes('rate limit') || error.message.includes('size')) {
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: error.message }
        }));
      }
    }
  });

  // Handle connection errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    try {
      const errorResponse = {
        type: 'error',
        data: {
          code: 'CONNECTION_ERROR',
          message: 'A connection error occurred',
        },
      };

      if (process.env.NODE_ENV !== 'production') {
        errorResponse.data.details = error.message;
      }

      ws.send(JSON.stringify(errorResponse));
    } catch (e) {
      console.error('Failed to send error message to client:', e);
    }
  });

  // Handle connection close
  ws.on('close', () => {
    console.log('Client disconnected:', ip);
    // Clean up any resources
    for (const [roomId, clients] of connections.entries()) {
      const index = clients.indexOf(ws);
      if (index !== -1) {
        clients.splice(index, 1);
        if (clients.length === 0) {
          connections.delete(roomId);
        }
      }
    }
  });
});

// Message handlers
async function handleMessage(ws, data) {
  try {
    const { roomId, content, userId } = data;
    
    // Validate required fields
    if (!roomId || !content || !userId) {
      throw new Error('Invalid message data: roomId, content, and userId are required');
    }

    // Validate content length
    if (content.length > 5000) { // 5000 character limit
      throw new Error('Message content exceeds maximum length');
    }

    console.log('Handling message for room:', roomId);
    
    // Store the connection
    if (!connections.has(roomId)) {
      connections.set(roomId, []);
    }
    if (!connections.get(roomId).includes(ws)) {
      connections.get(roomId).push(ws);
    }

    // Broadcast to all clients in the room immediately
    const messageData = {
      type: 'message',
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
    };

    // Use more efficient broadcasting
    broadcastToRoomOptimized(roomId, ws, messageData);
    
  } catch (error) {
    console.error('Error in handleMessage:', error);
    throw error;
  }
}

function handleTyping(ws, data) {
  try {
    const { roomId, userId, isTyping } = data;
    
    // Validate required fields
    if (!roomId || !userId) {
      throw new Error('Invalid typing data: roomId and userId are required');
    }

    console.log('Handling typing indicator for room:', roomId);
    
    broadcastToRoom(roomId, ws, {
      type: 'typing',
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error in handleTyping:', error);
    throw error;
  }
}

async function handleReaction(ws, data) {
  try {
    const { messageId, reaction } = data;
    if (!messageId || !reaction) {
      throw new Error('Invalid reaction data: messageId and reaction are required');
    }

    console.log('Handling reaction for message:', messageId);
    
    // Get the room ID from the message
    const { data: message, error } = await supabase
      .from('chat_messages')
      .select('room_id')
      .eq('id', messageId)
      .single();

    if (error) throw error;
    if (!message) throw new Error('Message not found');

    broadcastToRoom(message.room_id, null, {
      type: 'reaction',
      data
    });
  } catch (error) {
    console.error('Error in handleReaction:', error);
    throw error;
  }
}

async function handleMessageUpdate(ws, data) {
  try {
    const { messageId, content, roomId, userId } = data;
    
    // Validate required fields
    if (!messageId || !content || !roomId || !userId) {
      throw new Error('Invalid message update data: messageId, content, roomId, and userId are required');
    }

    // Validate content length
    if (content.length > 5000) {
      throw new Error('Updated message content exceeds maximum length');
    }

    console.log('Handling message update for message:', messageId);
    
    broadcastToRoom(roomId, null, {
      type: 'message_update',
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error in handleMessageUpdate:', error);
    throw error;
  }
}

async function handleMessageDelete(ws, data) {
  try {
    const { messageId, roomId, userId } = data;
    
    // Validate required fields
    if (!messageId || !roomId || !userId) {
      throw new Error('Invalid message delete data: messageId, roomId, and userId are required');
    }

    console.log('Handling message delete for message:', messageId);
    
    broadcastToRoom(roomId, null, {
      type: 'message_delete',
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error in handleMessageDelete:', error);
    throw error;
  }
}

// Report handlers for faster real-time updates
async function handleReportCreated(ws, data) {
  try {
    const { reportId, reportData } = data;
    
    // Validate required fields
    if (!reportId || !reportData) {
      throw new Error('Invalid report data: reportId and reportData are required');
    }

    console.log('Handling report creation:', reportId);
    
    // Broadcast to all clients immediately
    const messageData = {
      type: 'REPORT_CREATED',
      data: {
        ...reportData,
        timestamp: new Date().toISOString(),
      },
    };

    // Use optimized broadcasting for reports
    broadcastToAllOptimized(messageData);
    
  } catch (error) {
    console.error('Error in handleReportCreated:', error);
    throw error;
  }
}

async function handleReportUpdated(ws, data) {
  try {
    const { reportId, updates } = data;
    
    // Validate required fields
    if (!reportId || !updates) {
      throw new Error('Invalid report update data: reportId and updates are required');
    }

    console.log('Handling report update:', reportId);
    
    // Broadcast to all clients immediately
    const messageData = {
      type: 'REPORT_UPDATED',
      data: {
        reportId,
        updates,
        timestamp: new Date().toISOString(),
      },
    };

    // Use optimized broadcasting for reports
    broadcastToAllOptimized(messageData);
    
  } catch (error) {
    console.error('Error in handleReportUpdated:', error);
    throw error;
  }
}

function broadcastToRoom(roomId, sender, message) {
  const clients = connections.get(roomId) || [];
  const messageStr = JSON.stringify(message);

  clients.forEach((client) => {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      try {
        client.send(messageStr);
      } catch (error) {
        console.error('Error broadcasting to client:', error);
      }
    }
  });
}

// Optimized broadcasting function
function broadcastToRoomOptimized(roomId, sender, message) {
  const roomConnections = connections.get(roomId);
  if (!roomConnections) return;

  const messageStr = JSON.stringify(message);
  const deadConnections = [];

  // Send to all connections in parallel
  roomConnections.forEach((connection) => {
    try {
      if (connection.readyState === WebSocket.OPEN) {
        connection.send(messageStr);
      } else {
        deadConnections.push(connection);
      }
    } catch (error) {
      console.error('Error broadcasting message:', error);
      deadConnections.push(connection);
    }
  });

  // Clean up dead connections
  if (deadConnections.length > 0) {
    connections.set(roomId, roomConnections.filter(conn => !deadConnections.includes(conn)));
  }
}

// Optimized broadcasting to all clients
function broadcastToAllOptimized(message) {
  const messageStr = JSON.stringify(message);
  const deadConnections = [];

  // Send to all connections in parallel
  wss.clients.forEach((client) => {
    try {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      } else {
        deadConnections.push(client);
      }
    } catch (error) {
      console.error('Error broadcasting to client:', error);
      deadConnections.push(client);
    }
  });

  // Clean up dead connections
  if (deadConnections.length > 0) {
    deadConnections.forEach(client => {
      try {
        client.terminate();
      } catch (error) {
        console.error('Error terminating dead connection:', error);
      }
    });
  }
}

// Start the server
const PORT = process.env.WS_PORT || 3001;
server.listen(PORT, () => {
  console.log(`WebSocket server is running on port ${PORT}`);
});

process.on('SIGINT', () => {
  console.log('Shutting down WebSocket server...');
  wss.close(() => {
    console.log('WebSocket server closed');
    process.exit(0);
  });
}); 