require('dotenv').config();
const WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const wss = new WebSocket.Server({ port: 3001 });

// Store active connections
const connections = new Map();

wss.on('connection', (ws) => {
  console.log('New client connected');

  ws.on('message', async (message) => {
    try {
      const { type, data } = JSON.parse(message);
      console.log('Received message:', type, data);

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
          handleMessageUpdate(ws, data);
          break;
        case 'message_delete':
          handleMessageDelete(ws, data);
          break;
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    // Remove from connections
    for (const [roomId, clients] of connections.entries()) {
      connections.set(
        roomId,
        clients.filter((client) => client !== ws)
      );
    }
  });
});

async function handleMessage(ws, data) {
  const { roomId, content } = data;
  console.log('Handling message for room:', roomId);
  
  // Store the connection
  if (!connections.has(roomId)) {
    connections.set(roomId, []);
  }
  if (!connections.get(roomId).includes(ws)) {
    connections.get(roomId).push(ws);
  }

  // Broadcast to all clients in the room
  const clients = connections.get(roomId);
  if (clients) {
    clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        console.log('Broadcasting message to client');
        client.send(JSON.stringify({ type: 'message', data }));
      }
    });
  }
}

function handleTyping(ws, data) {
  const { roomId, userId, isTyping } = data;
  console.log('Handling typing indicator for room:', roomId);
  
  // Broadcast typing indicator to all clients in the room except sender
  const clients = connections.get(roomId);
  if (clients) {
    clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        console.log('Broadcasting typing indicator to client');
        client.send(JSON.stringify({ type: 'typing', data }));
      }
    });
  }
}

async function handleReaction(ws, data) {
  const { messageId, reaction } = data;
  console.log('Handling reaction for message:', messageId);
  
  // Get the room ID from the message
  const { data: message } = await supabase
    .from('chat_messages')
    .select('room_id')
    .eq('id', messageId)
    .single();

  if (message) {
    // Broadcast reaction to all clients in the room
    const clients = connections.get(message.room_id);
    if (clients) {
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          console.log('Broadcasting reaction to client');
          client.send(JSON.stringify({ type: 'reaction', data }));
        }
      });
    }
  }
}

function handleMessageUpdate(ws, data) {
  const { messageId, content } = data;
  console.log('Handling message update for message:', messageId);
  
  // Broadcast message update to all clients in the room
  const clients = connections.get(data.roomId);
  if (clients) {
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        console.log('Broadcasting message update to client');
        client.send(JSON.stringify({ type: 'message_update', data }));
      }
    });
  }
}

function handleMessageDelete(ws, data) {
  const { messageId } = data;
  console.log('Handling message delete for message:', messageId);
  
  // Broadcast message deletion to all clients in the room
  const clients = connections.get(data.roomId);
  if (clients) {
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        console.log('Broadcasting message delete to client');
        client.send(JSON.stringify({ type: 'message_delete', data }));
      }
    });
  }
}

console.log('WebSocket server running on port 3001'); 