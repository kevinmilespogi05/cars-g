import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

// Check required environment variables
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

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

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase configuration is incomplete');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test Supabase connection
const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    if (error) {
      console.error('❌ Failed to connect to Supabase:', error.message);
      console.error('   Please check your VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
      process.exit(1);
    }
    console.log('✅ Successfully connected to Supabase');
  } catch (error) {
    console.error('❌ Error testing Supabase connection:', error.message);
    process.exit(1);
  }
};

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));
app.use(express.json());

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
    
    // First, get the conversations
    const { data: conversations, error: convError } = await supabase
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
    
    const { data, error } = await supabase
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
    
    // Check if conversation already exists
    const { data: existing } = await supabase
      .from('chat_conversations')
      .select('*')
      .or(`and(participant1_id.eq.${participant1_id},participant2_id.eq.${participant2_id}),and(participant1_id.eq.${participant2_id},participant2_id.eq.${participant1_id})`)
      .single();

    if (existing) {
      return res.json(existing);
    }

    // Create new conversation
    const { data, error } = await supabase
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
    
    // First, get the message to verify ownership
    const { data: message, error: fetchError } = await supabase
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

    // Delete the message
    const { error: deleteError } = await supabase
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

      // Save message to Supabase
      const { data: message, error } = await supabase
        .from('chat_messages')
        .insert([{
          conversation_id,
          sender_id,
          content,
          message_type
        }])
        .select()
        .single();

      if (error) throw error;
      
      console.log('Message saved to database:', {
        messageId: message.id,
        messageType: message.message_type,
        contentLength: message.content?.length || 0
      });

      // Get conversation participants
      const { data: conversation, error: convError } = await supabase
        .from('chat_conversations')
        .select('participant1_id, participant2_id')
        .eq('id', conversation_id)
        .single();

      if (convError) throw convError;

      // Broadcast message to conversation room
      const messageWithUser = {
        ...message,
        sender: connectedUsers.get(sender_id)?.user
      };

      console.log('Broadcasting message to clients:', {
        messageId: messageWithUser.id,
        messageType: messageWithUser.message_type,
        contentLength: messageWithUser.content?.length || 0,
        conversationId: conversation_id
      });

      io.to(`conversation_${conversation_id}`).emit('new_message', messageWithUser);

      // Update conversation last_message_at
      await supabase
        .from('chat_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversation_id);

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
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 