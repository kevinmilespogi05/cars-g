import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

// Check required environment variables with fallbacks for development
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
];

// For development, use default values if not set
if (process.env.NODE_ENV === 'development') {
  if (!process.env.VITE_SUPABASE_URL) {
    process.env.VITE_SUPABASE_URL = 'https://mffuqdwqjdxbwpbhuxby.supabase.co';
    console.log('⚠️  Using default Supabase URL for development');
  }
  if (!process.env.VITE_SUPABASE_ANON_KEY) {
    console.log('⚠️  VITE_SUPABASE_ANON_KEY not set - chat functionality will be limited');
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('⚠️  SUPABASE_SERVICE_ROLE_KEY not set - chat functionality will be limited');
  }
} else {
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  if (missingEnvVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingEnvVars.forEach(envVar => {
      console.error(`   - ${envVar}`);
    });
    console.error('\n📝 Please create a .env file in the server directory with:');
    console.error('VITE_SUPABASE_URL=https://your-project.supabase.co');
    console.error('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here');
    console.error('\n🔑 Get your service role key from:');
    console.error('   Supabase Dashboard → Settings → API → service_role key');
    process.exit(1);
  }
}

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "http://localhost:5173",
      "http://localhost:3000",
      "https://cars-g.vercel.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create clients with available keys
const supabase = createClient(supabaseUrl, supabaseAnonKey || '');
const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

if (!supabaseUrl) {
  console.error('❌ VITE_SUPABASE_URL is required');
  process.exit(1);
}

// Test Supabase connection
const testSupabaseConnection = async () => {
  try {
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from('profiles').select('count').limit(1);
      if (error) {
        console.error('❌ Failed to connect to Supabase:', error.message);
        console.error('   Please check your VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
        process.exit(1);
      }
      console.log('✅ Successfully connected to Supabase with admin privileges');
    } else {
      // Test basic connection without admin privileges
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      if (error) {
        console.error('❌ Failed to connect to Supabase:', error.message);
        console.error('   Please check your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
        process.exit(1);
      }
      console.log('✅ Successfully connected to Supabase (limited functionality)');
      console.log('⚠️  Chat functionality will be limited without SUPABASE_SERVICE_ROLE_KEY');
    }
  } catch (error) {
    console.error('❌ Error testing Supabase connection:', error.message);
    process.exit(1);
  }
};

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || "http://localhost:5173",
    "http://localhost:5173",
    "http://localhost:3000",
    "https://cars-g.vercel.app"
  ],
  credentials: true
}));
app.use(express.json());
// In-memory rate limit for push registration
const recentRegistrations = new Map();

// Push: register device token
app.post('/api/push/register', async (req, res) => {
  try {
    const { token, userId, platform = 'web', userAgent } = req.body || {};
    if (!token || !userId) {
      return res.status(400).json({ error: 'token and userId are required' });
    }

    // rudimentary rate limit by user
    const last = recentRegistrations.get(userId) || 0;
    if (Date.now() - last < 5000) {
      return res.json({ ok: true });
    }

    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Admin privileges required' });
    }

    // Ensure table exists (idempotent upsert)
    await supabaseAdmin.rpc('ensure_push_subscriptions_table');

    // Upsert token
    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        token,
        platform,
        user_agent: userAgent || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'token' });

    if (error) throw error;
    recentRegistrations.set(userId, Date.now());
    res.json({ ok: true });
  } catch (e) {
    console.error('Push register error:', e);
    res.status(500).json({ error: 'Failed to register push token' });
  }
});

// Push: send test notification
app.post('/api/push/send', async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Admin privileges required' });
    }

    const { userId, title = 'Cars-G', body = 'Test notification', link } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const { data: subs, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('token')
      .eq('user_id', userId);
    if (error) throw error;

    const serverKey = process.env.FIREBASE_SERVER_KEY;
    if (!serverKey) return res.status(500).json({ error: 'FIREBASE_SERVER_KEY not configured' });

    const responses = [];
    for (const sub of subs || []) {
      const resp = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `key=${serverKey}`,
        },
        body: JSON.stringify({
          to: sub.token,
          notification: { title, body },
          data: { link: link || '/' },
        }),
      });
      responses.push({ token: sub.token, ok: resp.ok });
    }

    res.json({ ok: true, count: responses.length });
  } catch (e) {
    console.error('Push send error:', e);
    res.status(500).json({ error: 'Failed to send push' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    supabase: 'connected',
    websocket: 'running'
  });
});

// Chat API endpoints
app.get('/api/chat/conversations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('Fetching conversations for user:', userId);
    
    if (!supabaseAdmin) {
      return res.status(503).json({ 
        error: 'Chat service temporarily unavailable', 
        details: 'Admin privileges required for chat functionality' 
      });
    }
    
    // First, get the conversations using admin client to bypass RLS
    const { data: conversations, error: convError } = await supabaseAdmin
      .from('chat_conversations')
      .select('*')
      .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`);

    if (convError) {
      console.error('Error fetching conversations:', convError);
      throw convError;
    }

    console.log('Found conversations:', conversations);

    // For now, return basic conversation data without complex joins
    // We can add participant details later if needed
    res.json(conversations || []);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations', details: error.message });
  }
});

app.get('/api/chat/messages/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    console.log('Fetching messages for conversation:', conversationId);
    
    if (!supabaseAdmin) {
      return res.status(503).json({ 
        error: 'Chat service temporarily unavailable', 
        details: 'Admin privileges required for chat functionality' 
      });
    }
    
    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }

    console.log('Found messages:', data?.length || 0);
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages', details: error.message });
  }
 });

app.post('/api/chat/conversations', async (req, res) => {
  try {
    const { participant1_id, participant2_id } = req.body;
    
    if (!supabaseAdmin) {
      return res.status(503).json({ 
        error: 'Chat service temporarily unavailable', 
        details: 'Admin privileges required for chat functionality' 
      });
    }
    
    // Check if conversation already exists using admin client to bypass RLS
    const { data: existing } = await supabaseAdmin
      .from('chat_conversations')
      .select('*')
      .or(`and(participant1_id.eq.${participant1_id},participant2_id.eq.${participant2_id}),and(participant1_id.eq.${participant2_id},participant2_id.eq.${participant1_id})`)
      .single();

    if (existing) {
      return res.json(existing);
    }

    // Create new conversation using admin client to bypass RLS
    const { data, error } = await supabaseAdmin
      .from('chat_conversations')
      .insert([{ participant1_id, participant2_id }])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Delete message endpoint
app.delete('/api/chat/messages/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId } = req.body; // The user requesting the deletion
    
    if (!supabaseAdmin) {
      return res.status(503).json({ 
        error: 'Chat service temporarily unavailable', 
        details: 'Admin privileges required for chat functionality' 
      });
    }
    
    // First, get the message to verify ownership using admin client
    const { data: message, error: fetchError } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (fetchError || !message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if the user is the sender of the message
    if (message.sender_id !== userId) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    // Delete the message using admin client
    const { error: deleteError } = await supabaseAdmin
      .from('chat_messages')
      .delete()
      .eq('id', messageId);

    if (deleteError) throw deleteError;

    // Broadcast deletion to all users in the conversation
    io.to(`conversation_${message.conversation_id}`).emit('message_deleted', {
      messageId,
      conversationId: message.conversation_id
    });

    res.json({ success: true, messageId });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Cloudinary API endpoints
app.delete('/api/cloudinary/image/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }
    
    const token = authHeader.substring(7);
    
    // Verify the token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    // For now, allow any authenticated user to delete images
    // In production, you should implement proper admin role checking
    // You can add a profiles table with role field and check it here
    console.log(`User ${user.id} authenticated for image deletion`);
    
    // Delete from Cloudinary using their API
    const cloudName = process.env.VITE_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.VITE_CLOUDINARY_API_KEY;
    const apiSecret = process.env.VITE_CLOUDINARY_API_SECRET;
    
    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(500).json({ error: 'Cloudinary configuration missing' });
    }
    
    const timestamp = Math.round(new Date().getTime() / 1000);
             const signature = crypto.createHash('sha1')
           .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
           .digest('hex');
    
    const formData = new URLSearchParams();
    formData.append('public_id', publicId);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);
    
    const cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });
    
    if (!cloudinaryResponse.ok) {
      const errorData = await cloudinaryResponse.json();
      console.error('Cloudinary deletion failed:', errorData);
      return res.status(500).json({ 
        error: 'Failed to delete image from Cloudinary',
        details: errorData
      });
    }
    
    const result = await cloudinaryResponse.json();
    console.log('Successfully deleted image from Cloudinary:', publicId);
    
    res.json({ 
      success: true, 
      message: 'Image deleted successfully',
      result 
    });
    
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ 
      error: 'Failed to delete image',
      details: error.message 
    });
  }
});

app.post('/api/cloudinary/batch-delete', async (req, res) => {
  try {
    const { resources } = req.body;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }
    
    const token = authHeader.substring(7);
    
    // Verify the token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    // For now, allow any authenticated user to delete images
    // In production, you should implement proper admin role checking
    // You can add a profiles table with role field and check it here
    console.log(`User ${user.id} authenticated for batch image deletion`);
    
    if (!resources || !Array.isArray(resources) || resources.length === 0) {
      return res.status(400).json({ error: 'Resources array is required' });
    }
    
    const cloudName = process.env.VITE_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.VITE_CLOUDINARY_API_KEY;
    const apiSecret = process.env.VITE_CLOUDINARY_API_SECRET;
    
    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(500).json({ error: 'Cloudinary configuration missing' });
    }
    
    const results = [];
    const errors = [];
    let successful = 0;
    let failed = 0;
    
    // Process each resource deletion
    for (const resource of resources) {
      try {
        const { publicId, resourceType = 'image' } = resource;
        
        if (!publicId) {
          errors.push({ publicId: 'unknown', error: 'Missing public_id' });
          failed++;
          continue;
        }
        
        const timestamp = Math.round(new Date().getTime() / 1000);
        const signature = crypto.createHash('sha1')
          .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
          .digest('hex');
        
        const formData = new URLSearchParams();
        formData.append('public_id', publicId);
        formData.append('api_key', apiKey);
        formData.append('timestamp', timestamp);
        formData.append('signature', signature);
        
        const cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        });
        
        if (!cloudinaryResponse.ok) {
          const errorData = await cloudinaryResponse.json();
          errors.push({ publicId, error: errorData.error?.message || 'Deletion failed' });
          failed++;
        } else {
          const result = await cloudinaryResponse.json();
          results.push({ publicId, result });
          successful++;
        }
        
      } catch (error) {
        console.error(`Error deleting resource ${resource.publicId}:`, error);
        errors.push({ 
          publicId: resource.publicId || 'unknown', 
          error: error.message || 'Unknown error' 
        });
        failed++;
      }
    }
    
    const summary = {
      total: resources.length,
      successful,
      failed
    };
    
    console.log(`Batch deletion completed: ${successful} successful, ${failed} failed`);
    
    res.json({
      success: true,
      summary,
      results,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('Error in batch deletion:', error);
    res.status(500).json({ 
      error: 'Failed to process batch deletion',
      details: error.message 
    });
  }
});

// Socket.IO connection handling
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle user authentication
  socket.on('authenticate', async (userId) => {
    try {
      // Verify user exists in Supabase
      const { data: user, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('id', userId)
        .single();

      if (error || !user) {
        socket.emit('auth_error', { message: 'Invalid user' });
        return;
      }

      // Store user connection
      connectedUsers.set(userId, {
        socketId: socket.id,
        user: user
      });

      socket.userId = userId;
      socket.join(`user_${userId}`);
      
      console.log(`User ${user.username} authenticated with socket ${socket.id}`);
      socket.emit('authenticated', { user });
    } catch (error) {
      console.error('Authentication error:', error);
      socket.emit('auth_error', { message: 'Authentication failed' });
    }
  });

  // Handle joining a conversation
  socket.on('join_conversation', (conversationId) => {
    socket.join(`conversation_${conversationId}`);
    console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
  });

  // Handle leaving a conversation
  socket.on('leave_conversation', (conversationId) => {
    socket.leave(`conversation_${conversationId}`);
    console.log(`Socket ${socket.id} left conversation ${conversationId}`);
  });

  // Handle new message
  socket.on('send_message', async (messageData) => {
    try {
      const { conversation_id, sender_id, content, message_type = 'text' } = messageData;
      
      console.log('Received message from socket:', {
        conversation_id,
        sender_id,
        content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
        message_type,
        socketId: socket.id
      });

      if (!supabaseAdmin) {
        socket.emit('message_error', { 
          message: 'Chat service temporarily unavailable - admin privileges required' 
        });
        return;
      }

      // Save message to Supabase using admin client to bypass RLS
      const { data: message, error } = await supabaseAdmin
        .from('chat_messages')
        .insert([{
          conversation_id,
          sender_id,
          content,
          message_type
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Database error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      
      console.log('Message saved to database:', {
        messageId: message.id,
        messageType: message.message_type,
        contentLength: message.content?.length || 0
      });

      // Get conversation participants using admin client to bypass RLS
      if (!supabaseAdmin) {
        socket.emit('message_error', { 
          message: 'Chat service temporarily unavailable - admin privileges required' 
        });
        return;
      }

      const { data: conversation, error: convError } = await supabaseAdmin
        .from('chat_conversations')
        .select('participant1_id, participant2_id')
        .eq('id', conversation_id)
        .single();

      if (convError) {
        console.error('Error fetching conversation participants:', convError);
        throw convError;
      }

      // Broadcast message to conversation room
      const messageWithUser = {
        ...message,
        sender: connectedUsers.get(sender_id)?.user
      };

      console.log('Broadcasting message to clients:', {
        messageId: messageWithUser.id,
        messageType: message.message_type,
        contentLength: message.content?.length || 0,
        conversationId: conversation_id
      });

      io.to(`conversation_${conversation_id}`).emit('new_message', messageWithUser);

      // Update conversation last_message_at using admin client
      try {
        await supabaseAdmin
          .from('chat_conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversation_id);
      } catch (updateError) {
        console.error('Warning: Failed to update conversation timestamp:', updateError);
        // Don't fail the message send for this non-critical update
      }

      // Create a notification for the recipient user to trigger push
      try {
        const recipientId = conversation.participant1_id === sender_id
          ? conversation.participant2_id
          : conversation.participant1_id;
        const senderName = connectedUsers.get(sender_id)?.user?.username || 'New message';
        const preview = (content || '').slice(0, 120);
        const link = `/chat?conversationId=${conversation_id}`;

        await supabaseAdmin
          .from('notifications')
          .insert([{ user_id: recipientId, title: `New message from ${senderName}`, message: preview, link }]);
      } catch (notifError) {
        console.error('Warning: Failed to insert chat notification:', notifError);
        // Non-critical: chat message already delivered via socket
      }

    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('message_error', { message: 'Failed to send message' });
    }
  });

  // Handle typing indicator
  socket.on('typing_start', (conversationId) => {
    socket.to(`conversation_${conversationId}`).emit('user_typing', {
      userId: socket.userId,
      username: connectedUsers.get(socket.userId)?.user?.username
    });
  });

  socket.on('typing_stop', (conversationId) => {
    socket.to(`conversation_${conversationId}`).emit('user_stopped_typing', {
      userId: socket.userId
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      console.log(`User ${socket.userId} disconnected`);
    }
    console.log('Socket disconnected:', socket.id);
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Set default environment
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

const PORT = process.env.PORT || 3001;
const WS_PORT = process.env.WS_PORT || 3001;


// Start server after testing Supabase connection
const startServer = async () => {
  try {
    await testSupabaseConnection();
    
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🔌 WebSocket server running on port ${WS_PORT}`);
      console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log('\n✅ Chat server is ready!');
    });

    // Helper: send push to a specific user via FCM
    const sendPushToUser = async (userId, title, body, link) => {
      try {
        if (!supabaseAdmin) return;
        const { data: subs, error } = await supabaseAdmin
          .from('push_subscriptions')
          .select('token')
          .eq('user_id', userId);
        if (error) throw error;

        const serverKey = process.env.FIREBASE_SERVER_KEY;
        if (!serverKey) {
          console.warn('FIREBASE_SERVER_KEY not set, skipping push');
          return;
        }

        for (const sub of subs || []) {
          await fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `key=${serverKey}`,
            },
            body: JSON.stringify({
              to: sub.token,
              notification: { title, body },
              data: { link: link || '/' },
            }),
          });
        }
      } catch (err) {
        console.error('sendPushToUser error:', err);
      }
    };

    // Subscribe to notifications inserts and forward to FCM
    try {
      const channel = supabaseAdmin
        ? supabaseAdmin.channel('notify_fcm')
        : supabase.channel('notify_fcm');

      channel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, async (payload) => {
          const n = payload.new || {};
          const title = n.title || 'Cars-G';
          const body = n.message || '';
          const link = n.link || '/';
          const userId = n.user_id;
          if (userId) {
            await sendPushToUser(userId, title, body, link);
          }
        })
        .subscribe((status) => {
          console.log('Realtime notifications subscription status:', status);
        });
    } catch (subErr) {
      console.warn('Failed to subscribe to notifications realtime:', subErr);
    }
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 