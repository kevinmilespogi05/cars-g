const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');
const { createServer } = require('http');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://your-frontend-domain.vercel.app',
  credentials: true
}));
app.use(express.json());

// Supabase client
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.get('/api/status', (req, res) => {
  res.json({ 
    message: 'Cars-G API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// WebSocket server setup
const server = createServer(app);
const wss = new WebSocket.Server({ server });

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

// Handle new connections
wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  
  // Check connection rate limit
  if (isRateLimited(connectionLimiter, ip, RATE_LIMIT.connections)) {
    console.log(`Connection rate limited for IP: ${ip}`);
    ws.close(1008, 'Rate limit exceeded');
    return;
  }

  console.log(`New WebSocket connection from ${ip}`);
  
  // Set up connection
  ws.isAlive = true;
  ws.on('pong', heartbeat);
  
  // Store connection metadata
  const connectionId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
  connections.set(connectionId, {
    ws,
    ip,
    connectedAt: new Date(),
    userId: null
  });
  
  ws.connectionId = connectionId;

  // Handle authentication
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      
      if (message.type === 'auth') {
        const { accessToken } = message;
        
        if (!accessToken) {
          ws.send(JSON.stringify({ type: 'error', message: 'Access token required' }));
          return;
        }

        try {
          const { data: { user }, error } = await supabase.auth.getUser(accessToken);
          
          if (error || !user) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid access token' }));
            return;
          }

          // Update connection with user info
          const connection = connections.get(connectionId);
          if (connection) {
            connection.userId = user.id;
            connection.user = user;
          }

          ws.send(JSON.stringify({ 
            type: 'auth_success', 
            user: { id: user.id, email: user.email }
          }));
          
          console.log(`User ${user.id} authenticated on connection ${connectionId}`);
        } catch (authError) {
          console.error('Authentication error:', authError);
          ws.send(JSON.stringify({ type: 'error', message: 'Authentication failed' }));
        }
      }
      
      // Handle other message types here...
      
    } catch (error) {
      console.error('Message parsing error:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });

  // Handle connection close
  ws.on('close', () => {
    console.log(`Connection ${connectionId} closed`);
    connections.delete(connectionId);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error(`WebSocket error on connection ${connectionId}:`, error);
    connections.delete(connectionId);
  });

  // Send welcome message
  ws.send(JSON.stringify({ 
    type: 'connected', 
    message: 'Connected to Cars-G WebSocket server',
    connectionId 
  }));
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Cars-G API server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready for connections`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
}); 