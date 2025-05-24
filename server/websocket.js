const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');

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

const wss = new WebSocket.Server({ 
  port: 3001,
  clientTracking: true,
  // Add ping timeout
  pingTimeout: 5000,
});

// Store active connections with metadata
const connections = new Map();

function heartbeat() {
  this.isAlive = true;
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

wss.on('connection', (ws, req) => {
  console.log('New client connected');
  
  // Setup connection tracking
  ws.isAlive = true;
  ws.ip = req.socket.remoteAddress;
  ws.connectionTime = new Date();
  
  ws.on('pong', heartbeat);
  
  ws.on('ping', () => {
    ws.pong();
  });

  ws.on('message', async (message) => {
    try {
      // Handle heartbeat messages
      if (message.toString() === 'ping') {
        ws.send('pong');
        return;
      }

      const { type, data } = JSON.parse(message);
      console.log('Received message:', type, data);

      if (!type || !data) {
        throw new Error('Invalid message format');
      }

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
        default:
          console.warn('Unknown message type:', type);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      // Send error back to client
      ws.send(JSON.stringify({
        type: 'error',
        data: {
          message: 'Failed to process message',
          error: error.message
        }
      }));
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    try {
      ws.send(JSON.stringify({
        type: 'error',
        data: {
          message: 'WebSocket error occurred',
          error: error.message
        }
      }));
    } catch (e) {
      console.error('Failed to send error message to client:', e);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    // Remove from connections and cleanup
    for (const [roomId, clients] of connections.entries()) {
      const updatedClients = clients.filter((client) => client !== ws);
      if (updatedClients.length === 0) {
        connections.delete(roomId);
      } else {
        connections.set(roomId, updatedClients);
      }
    }
  });
});

async function handleMessage(ws, data) {
  try {
    const { roomId, content } = data;
    if (!roomId || !content) {
      throw new Error('Invalid message data: roomId and content are required');
    }

    console.log('Handling message for room:', roomId);
    
    // Store the connection
    if (!connections.has(roomId)) {
      connections.set(roomId, []);
    }
    if (!connections.get(roomId).includes(ws)) {
      connections.get(roomId).push(ws);
    }

    // Broadcast to all clients in the room
    broadcastToRoom(roomId, ws, {
      type: 'message',
      data
    });
  } catch (error) {
    console.error('Error in handleMessage:', error);
    throw error;
  }
}

function handleTyping(ws, data) {
  try {
    const { roomId, userId, isTyping } = data;
    if (!roomId || !userId) {
      throw new Error('Invalid typing data: roomId and userId are required');
    }

    console.log('Handling typing indicator for room:', roomId);
    
    broadcastToRoom(roomId, ws, {
      type: 'typing',
      data
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
    const { messageId, content, roomId } = data;
    if (!messageId || !content || !roomId) {
      throw new Error('Invalid message update data: messageId, content, and roomId are required');
    }

    console.log('Handling message update for message:', messageId);
    
    broadcastToRoom(roomId, null, {
      type: 'message_update',
      data
    });
  } catch (error) {
    console.error('Error in handleMessageUpdate:', error);
    throw error;
  }
}

async function handleMessageDelete(ws, data) {
  try {
    const { messageId, roomId } = data;
    if (!messageId || !roomId) {
      throw new Error('Invalid message delete data: messageId and roomId are required');
    }

    console.log('Handling message delete for message:', messageId);
    
    broadcastToRoom(roomId, null, {
      type: 'message_delete',
      data
    });
  } catch (error) {
    console.error('Error in handleMessageDelete:', error);
    throw error;
  }
}

function broadcastToRoom(roomId, excludeWs = null, message) {
  const clients = connections.get(roomId);
  if (clients) {
    clients.forEach((client) => {
      if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
        try {
          client.send(JSON.stringify(message));
        } catch (error) {
          console.error('Error broadcasting to client:', error);
        }
      }
    });
  }
}

process.on('SIGINT', () => {
  console.log('Shutting down WebSocket server...');
  wss.close(() => {
    console.log('WebSocket server closed');
    process.exit(0);
  });
});

console.log('WebSocket server running on port 3001'); 