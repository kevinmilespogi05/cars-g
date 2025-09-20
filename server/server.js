import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import fetch from 'node-fetch';
import { GoogleAuth } from 'google-auth-library';
import * as enhancedChatEndpoints from './enhancedChatEndpoints.js';

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
    "https://cars-g.vercel.app",
    "https://cars-g.vercel.app/",
    "https://cars-g-git-main-kevinmccarthy.vercel.app",
    "https://cars-g-git-main-kevinmccarthy.vercel.app/"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 200
}));
app.use(express.json());

// Handle CORS preflight requests
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Brevo (Sendinblue) email helper
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'no-reply@cars-g.app';
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || 'Cars-G';

async function sendEmailViaBrevo(toEmail, subject, textContent, htmlContent) {
  try {
    if (!BREVO_API_KEY) {
      console.warn('BREVO_API_KEY not set; skipping email');
      return { ok: false, skipped: true };
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY
      },
      body: JSON.stringify({
        sender: { email: BREVO_SENDER_EMAIL, name: BREVO_SENDER_NAME },
        to: [{ email: toEmail }],
        subject,
        textContent,
        htmlContent: htmlContent || `<p>${textContent}</p>`
      })
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('Brevo email send failed:', response.status, errText);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error('Brevo email error:', err);
    return { ok: false };
  }
}

// FCM HTTP v1 helper
const FCM_PROJECT_ID = process.env.FCM_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;

async function getFcmAccessToken() {
  try {
    const scopes = ['https://www.googleapis.com/auth/firebase.messaging'];
    const auth = new GoogleAuth({
      scopes,
      // Prefer inlined JSON; fallback to GOOGLE_APPLICATION_CREDENTIALS path if provided
      credentials: process.env.GOOGLE_SERVICE_ACCOUNT_JSON
        ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
        : undefined,
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || undefined,
    });
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    if (!accessToken || !accessToken.token) throw new Error('Failed to obtain FCM access token');
    return accessToken.token;
  } catch (err) {
    console.error('FCM v1 auth error:', err);
    return null;
  }
}

async function sendFcmV1ToToken(deviceToken, title, body, link) {
  try {
    if (!FCM_PROJECT_ID) {
      console.warn('FCM_PROJECT_ID not set; skipping FCM send');
      return { ok: false };
    }
    const token = await getFcmAccessToken();
    if (!token) return { ok: false };

    const endpoint = `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`;
    const message = {
      message: {
        token: deviceToken,
        // Use WebPush payload for browsers
        webpush: {
          notification: {
            title,
            body,
            icon: '/pwa-192x192.png'
          },
          fcmOptions: {
            link: String(link || '/')
          }
        },
        // Keep data for client-side handling if needed
        data: { link: String(link || '/') }
      }
    };

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(message)
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      console.error('FCM v1 send failed:', resp.status, errText);
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.error('FCM v1 send error:', e);
    return { ok: false };
  }
}

// Test email endpoint
app.post('/api/email/test', async (req, res) => {
  try {
    const { to, subject = 'Cars-G test email', text = 'Hello from Cars-G' } = req.body || {};
    if (!to) return res.status(400).json({ error: 'to is required' });
    const result = await sendEmailViaBrevo(to, subject, text);
    if (!result.ok && !result.skipped) return res.status(500).json({ error: 'Failed to send email' });
    res.json({ ok: true, skipped: !!result.skipped });
  } catch (e) {
    console.error('Email test error:', e);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

// Global rate limit (basic protection)
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // 300 requests/min per IP
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Performance tracking middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Use circular buffer to prevent memory leaks
    if (performanceMetrics.responseTimes.length >= 100) {
      performanceMetrics.responseTimes.shift();
    }
    performanceMetrics.responseTimes.push(duration);
    
    // Update average response time efficiently
    const total = performanceMetrics.responseTimes.reduce((a, b) => a + b, 0);
    performanceMetrics.averageResponseTime = Math.round(total / performanceMetrics.responseTimes.length);
  });
  next();
});

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

    const responses = [];
    for (const sub of subs || []) {
      const resp = await sendFcmV1ToToken(sub.token, title, body, link);
      responses.push({ token: sub.token, ok: !!resp.ok });
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
    websocket: 'running',
    cors: 'configured',
    environment: process.env.NODE_ENV || 'development'
  });
});

// WebSocket health check
app.get('/ws-health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    websocket: 'available',
    connectedUsers: connectedUsers.size,
    timestamp: new Date().toISOString()
  });
});

// Current user quota usage
app.get('/api/quotas/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Admin privileges required' });
    }
    // Get configured limit
    const { data: quotaRow } = await supabaseAdmin
      .from('report_quotas')
      .select('daily_limit')
      .eq('user_id', userId)
      .maybeSingle();
    const dailyLimit = quotaRow?.daily_limit ?? 20;

    // Count last 24h
    const { data: countRows, error: countError } = await supabaseAdmin
      .rpc('can_create_report', { user_uuid: userId });
    // We used the boolean check for RLS; for actual usage number, query directly
    const { data: reportsCountData, error: cntErr } = await supabaseAdmin
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gt('created_at', new Date(Date.now() - 24*60*60*1000).toISOString());
    const used = reportsCountData?.length ? reportsCountData.length : (reportsCountData === null ? 0 : 0);
    // Supabase head+count returns count in response headers; client lib exposes via count on select when not head
    // Simpler: fetch ids with limit and count via length (OK for small limits)

    res.json({ dailyLimit, used });
  } catch (e) {
    console.error('Quota endpoint error:', e);
    res.status(500).json({ error: 'Failed to fetch quota' });
  }
});

// Enhanced Chat API endpoints
// Get conversations with enhanced participant data
app.get('/api/chat/conversations/:userId', enhancedChatEndpoints.getConversationsWithParticipants);

// Get conversation participants
app.get('/api/chat/conversations/:conversationId/participants', enhancedChatEndpoints.getConversationParticipants);

// Get conversation details
app.get('/api/chat/conversations/details/:conversationId', enhancedChatEndpoints.getConversationDetails);

// Search conversations
app.get('/api/chat/conversations/search', enhancedChatEndpoints.searchConversations);

// Get total unread count
app.get('/api/chat/unread-count', enhancedChatEndpoints.getTotalUnreadCount);

// Get messages with pagination
app.get('/api/chat/messages/:conversationId', enhancedChatEndpoints.getMessagesWithPagination);

// Send message with rate limiting
app.post('/api/chat/messages', messageRateLimiter, enhancedChatEndpoints.sendMessage);

// Mark conversation as read
app.post('/api/chat/conversations/:conversationId/read', enhancedChatEndpoints.markConversationAsRead);

// Get unread count for conversation
app.get('/api/chat/conversations/:conversationId/unread', enhancedChatEndpoints.getUnreadCount);

// Stricter rate limit for conversation creation
const createConversationLimiter = rateLimit({ windowMs: 60 * 1000, max: 20 });

// Rate limit for message sending
const messageRateLimiter = rateLimit({ 
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 messages per minute per IP
  message: 'Too many messages sent, please slow down'
});

app.post('/api/chat/conversations', createConversationLimiter, async (req, res) => {
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

// Socket.IO connection handling with performance optimizations
const connectedUsers = new Map();
const messageQueue = new Map(); // Queue for batched messages
const BATCH_DELAY = 10; // Reduced to 10ms for better real-time performance
const batchTimers = new Map();

// Performance monitoring
const performanceMetrics = {
  messagesProcessed: 0,
  connectionsActive: 0,
  averageResponseTime: 0,
  startTime: Date.now(),
  responseTimes: []
};

// Simulate some activity for development
if (process.env.NODE_ENV === 'development') {
  // Add some sample response times to make metrics look realistic
  performanceMetrics.responseTimes = [45, 67, 23, 89, 34, 56, 78, 12, 45, 67];
  performanceMetrics.messagesProcessed = 15;
  
  // Update average response time
  const total = performanceMetrics.responseTimes.reduce((a, b) => a + b, 0);
  performanceMetrics.averageResponseTime = Math.round(total / performanceMetrics.responseTimes.length);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - performanceMetrics.startTime) / 1000)
  });
});

// Performance API endpoint
app.get('/api/performance', (req, res) => {
  const uptime = Math.floor((Date.now() - performanceMetrics.startTime) / 1000);
  const messagesPerSecond = uptime > 0 ? (performanceMetrics.messagesProcessed / uptime).toFixed(2) : 0;
  
  // Calculate average response time from recent samples
  const recentResponseTimes = performanceMetrics.responseTimes.slice(-10); // Last 10 samples
  const avgResponseTime = recentResponseTimes.length > 0 
    ? Math.round(recentResponseTimes.reduce((a, b) => a + b, 0) / recentResponseTimes.length)
    : 0;
  
  res.json({
    uptime,
    connectionsActive: performanceMetrics.connectionsActive,
    messagesProcessed: performanceMetrics.messagesProcessed,
    averageResponseTime: avgResponseTime,
    messagesPerSecond: parseFloat(messagesPerSecond)
  });
});

// Optimized Socket.IO configuration for real-time performance
const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "http://localhost:5173",
      "http://localhost:3000",
      "https://cars-g.vercel.app",
      "https://cars-g.vercel.app/",
      "https://cars-g-git-main-kevinmccarthy.vercel.app",
      "https://cars-g-git-main-kevinmccarthy.vercel.app/"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true
  },
  transports: ['websocket', 'polling'], // Allow fallback to polling for better compatibility
  allowEIO3: false, // Disable legacy support
  pingTimeout: 30000, // Reduced for faster detection of disconnections
  pingInterval: 15000, // More frequent pings for better connection health
  maxHttpBufferSize: 1e6, // 1MB
  // Performance optimizations for real-time
  connectTimeout: 15000, // Reduced timeout for faster connection
  upgradeTimeout: 15000, // Reduced upgrade timeout
  allowUpgrades: true, // Enable upgrade for better compatibility
  rememberUpgrade: true,
  perMessageDeflate: {
    threshold: 16384, // Reduced threshold for faster compression
    zlibInflateOptions: {
      chunkSize: 8 * 1024
    },
    zlibDeflateOptions: {
      level: 3 // Faster compression
    }
  }
});

// Message batching function
const flushMessageBatch = async (conversationId) => {
  const batch = messageQueue.get(conversationId);
  if (!batch || batch.length === 0) return;

  const startTime = Date.now();
  
  try {
    // Process all messages in the batch
    const messages = [];
    for (const msgData of batch) {
      const { sender_id, content, message_type = 'text' } = msgData;
      
      // Save message to Supabase using admin client
      const { data: message, error } = await supabaseAdmin
        .from('chat_messages')
        .insert([{
          conversation_id: conversationId,
          sender_id,
          content,
          message_type
        }])
        .select()
        .single();

      if (error) {
        console.error('Database error saving message:', error);
        continue;
      }

      messages.push({
        ...message,
        sender: connectedUsers.get(sender_id)?.user
      });
    }

    // Broadcast all messages to conversation room
    if (messages.length > 0) {
      io.to(`conversation_${conversationId}`).emit('new_messages_batch', messages);
      
      // Update conversation timestamp
      try {
        await supabaseAdmin
          .from('chat_conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversationId);
      } catch (updateError) {
        console.error('Warning: Failed to update conversation timestamp:', updateError);
      }
    }

    // Update performance metrics
    const responseTime = Date.now() - startTime;
    performanceMetrics.messagesProcessed += messages.length;
    performanceMetrics.averageResponseTime = 
      (performanceMetrics.averageResponseTime + responseTime) / 2;

  } catch (error) {
    console.error('Error processing message batch:', error);
  }

  // Clear batch
  messageQueue.delete(conversationId);
  const timer = batchTimers.get(conversationId);
  if (timer) {
    clearTimeout(timer);
    batchTimers.delete(conversationId);
  }
};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  console.log('Connection origin:', socket.handshake.headers.origin);
  console.log('Connection headers:', socket.handshake.headers);
  performanceMetrics.connectionsActive++;
  
  // Enhanced connection monitoring
  socket.lastPing = Date.now();
  socket.isAlive = true;
  
  // Track message processing for performance metrics
  const originalEmit = socket.emit;
  socket.emit = function(event, ...args) {
    if (event !== 'authenticated' && event !== 'auth_error') {
      performanceMetrics.messagesProcessed++;
    }
    return originalEmit.apply(this, [event, ...args]);
  };
  
  // Add connection deduplication
  socket.authenticated = false;
  socket.userId = null;

  // Handle user authentication with caching
  socket.on('authenticate', async (userId) => {
    try {
      // Check if user is already authenticated on this socket
      if (socket.userId === userId && connectedUsers.has(userId)) {
        socket.emit('authenticated', { user: connectedUsers.get(userId).user });
        return;
      }

      // Check if user is already connected on another socket
      if (connectedUsers.has(userId)) {
        const existingConnection = connectedUsers.get(userId);
        console.log(`User ${userId} already connected on socket ${existingConnection.socketId}, updating to ${socket.id}`);
        
        // Update the connection to use the new socket
        connectedUsers.set(userId, {
          socketId: socket.id,
          user: existingConnection.user,
          lastSeen: Date.now()
        });
        
        socket.userId = userId;
        socket.authenticated = true;
        socket.join(`user_${userId}`);
        
        console.log(`User ${existingConnection.user.username} reconnected with socket ${socket.id}`);
        socket.emit('authenticated', { user: existingConnection.user });
        return;
      }

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
        user: user,
        lastSeen: Date.now()
      });

      socket.userId = userId;
      socket.authenticated = true;
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
    // Validate authentication first
    if (!socket.authenticated || !socket.userId) {
      return;
    }

    socket.join(`conversation_${conversationId}`);
    console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
  });

  // Handle leaving a conversation
  socket.on('leave_conversation', (conversationId) => {
    // Validate authentication first
    if (!socket.authenticated || !socket.userId) {
      return;
    }

    socket.leave(`conversation_${conversationId}`);
    console.log(`Socket ${socket.id} left conversation ${conversationId}`);
  });

  // Handle single message with immediate processing for real-time performance
  socket.on('send_message', async (messageData, callback) => {
    try {
      // Validate authentication first
      if (!socket.authenticated || !socket.userId) {
        socket.emit('auth_error', { message: 'Not authenticated' });
        if (callback && typeof callback === 'function') {
          callback({ success: false, error: 'Not authenticated' });
        }
        return;
      }

      const { conversation_id, sender_id, content, message_type = 'text' } = messageData;
      
      // Validate sender matches authenticated user
      if (sender_id !== socket.userId) {
        socket.emit('message_error', { message: 'Sender ID mismatch' });
        if (callback && typeof callback === 'function') {
          callback({ success: false, error: 'Sender ID mismatch' });
        }
        return;
      }
      
      // Process message immediately for real-time performance
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
        console.error('Database error saving message:', error);
        socket.emit('message_error', { message: 'Failed to save message' });
        
        if (callback && typeof callback === 'function') {
          callback({ success: false, error: 'Failed to save message' });
        }
        return;
      }

      // Add sender information
      const messageWithSender = {
        ...message,
        sender: connectedUsers.get(sender_id)?.user
      };

      // Broadcast immediately to conversation room
      io.to(`conversation_${conversation_id}`).emit('new_message', messageWithSender);
      
      // Update conversation timestamp
      try {
        await supabaseAdmin
          .from('chat_conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversation_id);
      } catch (updateError) {
        console.error('Warning: Failed to update conversation timestamp:', updateError);
      }

      // Update performance metrics
      performanceMetrics.messagesProcessed++;

      // Send success response to client
      if (callback && typeof callback === 'function') {
        callback({ success: true, message: messageWithSender });
      }

    } catch (error) {
      console.error('Error processing message:', error);
      socket.emit('message_error', { message: 'Failed to process message' });
      
      // Send error response to client
      if (callback && typeof callback === 'function') {
        callback({ success: false, error: 'Failed to process message' });
      }
    }
  });

  // Handle batched messages (new optimized method)
  socket.on('send_message_batch', async (batchData) => {
    try {
      // Validate authentication first
      if (!socket.authenticated || !socket.userId) {
        socket.emit('auth_error', { message: 'Not authenticated' });
        return;
      }

      const { conversation_id, messages } = batchData;
      
      const startTime = Date.now();
      
      // Process all messages in parallel
      const messagePromises = messages.map(async (msgData) => {
        const { content, message_type = 'text' } = msgData;
        
        const { data: message, error } = await supabaseAdmin
          .from('chat_messages')
          .insert([{
            conversation_id,
            sender_id: socket.userId,
            content,
            message_type
          }])
          .select()
          .single();

        if (error) {
          console.error('Database error saving message:', error);
          return null;
        }

        return {
          ...message,
          sender: connectedUsers.get(socket.userId)?.user
        };
      });

      const savedMessages = (await Promise.all(messagePromises)).filter(Boolean);

      // Broadcast all messages at once
      if (savedMessages.length > 0) {
        io.to(`conversation_${conversation_id}`).emit('new_messages_batch', savedMessages);
        
        // Update conversation timestamp
        try {
          await supabaseAdmin
            .from('chat_conversations')
            .update({ last_message_at: new Date().toISOString() })
            .eq('id', conversation_id);
        } catch (updateError) {
          console.error('Warning: Failed to update conversation timestamp:', updateError);
        }
      }

      // Update performance metrics
      const responseTime = Date.now() - startTime;
      performanceMetrics.messagesProcessed += savedMessages.length;
      performanceMetrics.averageResponseTime = 
        (performanceMetrics.averageResponseTime + responseTime) / 2;

    } catch (error) {
      console.error('Error processing message batch:', error);
      socket.emit('message_error', { message: 'Failed to process message batch' });
    }
  });

  // Handle typing indicator with debouncing
  const typingTimers = new Map();
  socket.on('typing_start', (conversationId) => {
    // Validate authentication first
    if (!socket.authenticated || !socket.userId) {
      return;
    }

    const key = `${socket.id}-${conversationId}`;
    
    // Clear existing timer
    if (typingTimers.has(key)) {
      clearTimeout(typingTimers.get(key));
    }
    
    socket.to(`conversation_${conversationId}`).emit('user_typing', {
      userId: socket.userId,
      username: connectedUsers.get(socket.userId)?.user?.username
    });
    
    // Auto-stop typing after 3 seconds
    const timer = setTimeout(() => {
      socket.to(`conversation_${conversationId}`).emit('user_stopped_typing', {
        userId: socket.userId
      });
      typingTimers.delete(key);
    }, 3000);
    
    typingTimers.set(key, timer);
  });

  socket.on('typing_stop', (conversationId) => {
    // Validate authentication first
    if (!socket.authenticated || !socket.userId) {
      return;
    }

    const key = `${socket.id}-${conversationId}`;
    if (typingTimers.has(key)) {
      clearTimeout(typingTimers.get(key));
      typingTimers.delete(key);
    }
    
    socket.to(`conversation_${conversationId}`).emit('user_stopped_typing', {
      userId: socket.userId
    });
  });

  // Handle ping/pong for connection health
  socket.on('ping', () => {
    socket.lastPing = Date.now();
    socket.isAlive = true;
    socket.emit('pong');
  });

  socket.on('pong', () => {
    socket.lastPing = Date.now();
    socket.isAlive = true;
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (socket.userId) {
      // Only remove user if this socket was the active one
      const currentConnection = connectedUsers.get(socket.userId);
      if (currentConnection && currentConnection.socketId === socket.id) {
        connectedUsers.delete(socket.userId);
        console.log(`User ${socket.userId} disconnected from active socket ${socket.id}`);
      } else {
        console.log(`User ${socket.userId} disconnected from inactive socket ${socket.id}`);
      }
    }
    
    // Clear any pending timers
    typingTimers.forEach((timer, key) => {
      if (key.startsWith(socket.id)) {
        clearTimeout(timer);
        typingTimers.delete(key);
      }
    });
    
    performanceMetrics.connectionsActive = Math.max(0, performanceMetrics.connectionsActive - 1);
    console.log('Socket disconnected:', socket.id);
  });
});

// Connection health monitoring
setInterval(() => {
  const now = Date.now();
  io.sockets.sockets.forEach((socket) => {
    if (socket.lastPing && now - socket.lastPing > 60000) { // 60 seconds timeout
      console.log(`Disconnecting stale socket: ${socket.id}`);
      socket.disconnect(true);
    }
  });
}, 30000); // Check every 30 seconds

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

    // Helper: send push to a specific user via FCM v1
    const sendPushToUser = async (userId, title, body, link) => {
      try {
        if (!supabaseAdmin) return;
        const { data: subs, error } = await supabaseAdmin
          .from('push_subscriptions')
          .select('token')
          .eq('user_id', userId);
        if (error) throw error;

        for (const sub of subs || []) {
          await sendFcmV1ToToken(sub.token, title, body, link);
        }
      } catch (err) {
        console.error('sendPushToUser error:', err);
      }
    };

    // Subscribe to notifications inserts and forward to FCM and Brevo email
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

            // Additionally try to send email via Brevo if user has an email
            try {
              const { data: profile, error: profErr } = await supabaseAdmin
                .from('profiles')
                .select('email, notification_settings')
                .eq('id', userId)
                .single();

              if (!profErr && profile?.email) {
                const allowEmail = profile.notification_settings?.email !== false;
                if (allowEmail) {
                  const subject = title;
                  const textContent = `${body}${link ? `\n\nOpen: ${process.env.FRONTEND_URL || 'https://cars-g.vercel.app'}${link.startsWith('/') ? link : `/${link}`}` : ''}`;
                  await sendEmailViaBrevo(profile.email, subject, textContent);
                }
              }
            } catch (mailErr) {
              console.warn('Email send skipped/error:', mailErr?.message || mailErr);
            }
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
