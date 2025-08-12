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
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow local development
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }
    
    // Allow production frontend
    if (origin === 'https://cars-g.vercel.app' || origin === 'https://cars-g.vercel.app/') {
      return callback(null, true);
    }
    
    // Allow other origins if specified in environment
    const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Log blocked origins for debugging
    console.log(`Blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));
app.use(express.json());

// Handle CORS preflight requests
app.use((req, res, next) => {
  // Set CORS headers for all responses
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

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
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({ 
    message: 'Cars-G API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Reports API endpoints
app.get('/api/reports', async (req, res) => {
  try {
    // Get reports from Supabase
    const { data: reports, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch reports',
        message: error.message 
      });
    }

    res.json({
      success: true,
      data: reports,
      count: reports.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Create report endpoint
app.post('/api/reports', async (req, res) => {
  try {
    const { title, description, location, image_url, user_id } = req.body;

    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['title', 'description']
      });
    }

    // Insert report into Supabase
    const { data: report, error } = await supabase
      .from('reports')
      .insert([{
        title,
        description,
        location: location || null,
        image_url: image_url || null,
        user_id: user_id || null,
        status: 'pending'
      }])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ 
        error: 'Failed to create report',
        message: error.message 
      });
    }

    // Broadcast to WebSocket clients
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'REPORT_CREATED',
          data: report
        }));
      }
    });

    res.status(201).json({
      success: true,
      data: report,
      message: 'Report created successfully'
    });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Update report status endpoint
app.patch('/api/reports/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['pending', 'in_progress', 'resolved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        validStatuses
      });
    }

    // Update report status
    const { data: report, error } = await supabase
      .from('reports')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ 
        error: 'Failed to update report',
        message: error.message 
      });
    }

    if (!report) {
      return res.status(404).json({
        error: 'Report not found'
      });
    }

    // Broadcast to WebSocket clients
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'REPORT_UPDATED',
          data: report
        }));
      }
    });

    res.json({
      success: true,
      data: report,
      message: 'Report status updated successfully'
    });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Get single report endpoint
app.get('/api/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: report, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch report',
        message: error.message 
      });
    }

    if (!report) {
      return res.status(404).json({
        error: 'Report not found'
      });
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Cloudinary deletion endpoint
app.delete('/api/cloudinary/:resourceType/:publicId', async (req, res) => {
  try {
    const { resourceType, publicId } = req.params;
    const { authorization } = req.headers;

    // Validate resource type
    if (!['image', 'video'].includes(resourceType)) {
      return res.status(400).json({
        error: 'Invalid resource type',
        message: 'Resource type must be "image" or "video"'
      });
    }

    // Validate public ID
    if (!publicId) {
      return res.status(400).json({
        error: 'Missing public ID',
        message: 'Public ID is required'
      });
    }

    // Check authorization
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Valid Bearer token required'
      });
    }

    const token = authorization.replace('Bearer ', '');
    
    try {
      // Verify the JWT token with Supabase
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        console.error('Token validation failed:', authError);
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or expired token'
        });
      }
      
      console.log(`User ${user.id} authorized for Cloudinary deletion`);
    } catch (authError) {
      console.error('Auth error:', authError);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token validation failed'
      });
    }

    // Cloudinary configuration
    const cloudName = process.env.VITE_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.VITE_CLOUDINARY_API_KEY;
    const apiSecret = process.env.VITE_CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.error('Cloudinary configuration missing');
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'Cloudinary is not properly configured'
      });
    }

    // Generate timestamp and signature for Cloudinary
    const timestamp = Math.floor(Date.now() / 1000);
    const params = `public_id=${publicId}&timestamp=${timestamp}`;
    
    // In production, you should use proper crypto for signature generation
    // This is a simplified version - consider using crypto.createHmac
    const signature = require('crypto')
      .createHmac('sha1', apiSecret)
      .update(params)
      .digest('hex');

    // Delete from Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          public_id: publicId,
          api_key: apiKey,
          signature: signature,
          timestamp: timestamp,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Cloudinary deletion failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      return res.status(response.status).json({
        error: 'Cloudinary deletion failed',
        message: errorData.error?.message || response.statusText,
        details: errorData
      });
    }

    const result = await response.json();
    console.log('Cloudinary deletion successful:', result);

    res.json({
      success: true,
      message: 'Resource deleted successfully',
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cloudinary deletion error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Batch Cloudinary deletion endpoint
app.post('/api/cloudinary/batch-delete', async (req, res) => {
  try {
    const { resources } = req.body;
    const { authorization } = req.headers;

    // Validate request body
    if (!resources || !Array.isArray(resources) || resources.length === 0) {
      return res.status(400).json({
        error: 'Invalid request body',
        message: 'Resources array is required and must not be empty'
      });
    }

    // Check authorization
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Valid Bearer token required'
      });
    }

    const token = authorization.replace('Bearer ', '');
    
    try {
      // Verify the JWT token with Supabase
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        console.error('Token validation failed:', authError);
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or expired token'
        });
      }
      
      console.log(`User ${user.id} authorized for batch Cloudinary deletion`);
    } catch (authError) {
      console.error('Auth error:', authError);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token validation failed'
      });
    }

    // Cloudinary configuration
    const cloudName = process.env.VITE_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.VITE_CLOUDINARY_API_KEY;
    const apiSecret = process.env.VITE_CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.error('Cloudinary configuration missing');
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'Cloudinary is not properly configured'
      });
    }

    const results = [];
    const errors = [];

    // Process each resource deletion
    for (const resource of resources) {
      try {
        const { publicId, resourceType = 'image' } = resource;
        
        if (!publicId) {
          errors.push({ publicId: 'unknown', error: 'Missing public ID' });
          continue;
        }

        // Generate timestamp and signature
        const timestamp = Math.floor(Date.now() / 1000);
        const params = `public_id=${publicId}&timestamp=${timestamp}`;
        const signature = require('crypto')
          .createHmac('sha1', apiSecret)
          .update(params)
          .digest('hex');

        // Delete from Cloudinary
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              public_id: publicId,
              api_key: apiKey,
              signature: signature,
              timestamp: timestamp,
            }),
          }
        );

        if (response.ok) {
          const result = await response.json();
          results.push({ publicId, success: true, data: result });
          console.log(`Successfully deleted: ${publicId}`);
        } else {
          const errorData = await response.json().catch(() => ({}));
          const error = {
            publicId,
            error: errorData.error?.message || response.statusText,
            status: response.status
          };
          errors.push(error);
          console.error(`Failed to delete ${publicId}:`, error);
        }
      } catch (error) {
        const errorInfo = {
          publicId: resource.publicId || 'unknown',
          error: error.message,
          status: 'EXCEPTION'
        };
        errors.push(errorInfo);
        console.error(`Exception deleting resource:`, errorInfo);
      }
    }

    // Return results
    res.json({
      success: true,
      message: `Batch deletion completed: ${results.length} successful, ${errors.length} failed`,
      results,
      errors,
      summary: {
        total: resources.length,
        successful: results.length,
        failed: errors.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Batch deletion error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
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
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 API status: http://localhost:${PORT}/api/status`);
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