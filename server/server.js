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
import multer from 'multer';
import { generateTokenPair, verifyToken, extractTokenFromHeader } from './lib/jwt.js';
import { authenticateToken, requireRole } from './middleware/auth.js';
import EmailService from './lib/emailService.js';
import GmailEmailService from './lib/gmailEmailService.js';

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

// Initialize Socket.IO
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
    methods: ["GET", "POST"],
    credentials: true
  }
});


// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create clients with available keys
const supabase = createClient(supabaseUrl, supabaseAnonKey || '');
const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

// Initialize email services
const emailService = new EmailService();
const gmailEmailService = new GmailEmailService();

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
// Enhanced JSON parsing with better error handling
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf, encoding) => {
    // Only validate JSON if there's actual content
    if (buf && buf.length > 0) {
      try {
        JSON.parse(buf);
      } catch (e) {
        console.error('❌ Invalid JSON received:', buf.toString());
        // Don't throw error, let express handle it gracefully
        return false;
      }
    }
    return true;
  }
}));

// Error handler for JSON parsing errors
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    console.error('❌ JSON parsing error:', error.message);
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON format',
      code: 'INVALID_JSON'
    });
  }
  next(error);
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'), false);
    }
  }
});

// Handle CORS preflight requests
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});


// FCM HTTP v1 helper
const FCM_PROJECT_ID = process.env.FCM_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;

async function getFcmAccessToken() {
  try {
    const scopes = ['https://www.googleapis.com/auth/firebase.messaging'];
    
    // Try to load service account from file first
    let credentials;
    try {
      const fs = await import('fs');
      const serviceKeyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './service_key.json';
      const serviceKey = JSON.parse(fs.readFileSync(serviceKeyPath, 'utf8'));
      credentials = serviceKey;
      console.log('✅ Loaded Firebase service account from file');
    } catch (fileError) {
      console.log('Could not load service key from file, trying environment variable...');
      // Fallback to environment variable
      if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        console.log('✅ Loaded Firebase service account from environment variable');
      } else {
        throw new Error('No Firebase service account credentials found');
      }
    }
    
    const auth = new GoogleAuth({
      scopes,
      credentials
    });
    
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    if (!accessToken || !accessToken.token) throw new Error('Failed to obtain FCM access token');
    console.log('✅ FCM access token obtained successfully');
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
      return { ok: false, error: `HTTP ${resp.status}: ${errText}` };
    }
    return { ok: true };
  } catch (e) {
    // Capture and return detailed error information
    try {
      const msg = typeof e === 'string' ? e : (e?.message || JSON.stringify(e));
      console.error('FCM v1 send error:', msg);
      return { ok: false, error: msg };
    } catch {
      console.error('FCM v1 send error (unknown)');
      return { ok: false, error: 'Unknown error' };
    }
  }
}


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

// Rate limiting for email verification
const emailVerificationAttempts = new Map();

// Push: register device token
app.post('/api/push/register', async (req, res) => {
  try {
    const { token, userId, platform = 'web', userAgent } = req.body || {};
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // If no token provided, just log the registration attempt
    if (!token) {
      console.log(`📱 Push registration attempt for user ${userId} (${platform}) - no FCM token`);
      return res.json({ 
        success: true, 
        message: 'Registration logged (server-side notifications only)' 
      });
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

// Comments: create report comment via service role for logging
// Helper to handle comment creation
async function handleCreateComment(req, res) {
  try {
    const { reportId } = req.params;
    const { userId, comment, commentType = 'comment' } = req.body || {};

    if (!reportId || !userId || !comment) {
      return res.status(400).json({ error: 'reportId, userId and comment are required' });
    }

    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Admin privileges required' });
    }

    const { data, error } = await supabaseAdmin
      .from('report_comments')
      .insert({
        report_id: reportId,
        user_id: userId,
        comment: comment,
        comment_type: commentType
      })
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message || 'Failed to add comment' });
    }

    // Fetch minimal profile info for convenience
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', userId)
      .single();

    res.json({
      ...data,
      user_profile: profile || { username: 'Unknown', avatar_url: null }
    });
  } catch (e) {
    console.error('Create comment error:', e);
    res.status(500).json({ error: 'Failed to create comment' });
  }
}

// Primary route
app.post('/api/reports/:reportId/comments', handleCreateComment);
// Alias route (in case reverse proxy strips /api)
app.post('/reports/:reportId/comments', handleCreateComment);

// Reports: create via service role to avoid client RLS/session issues
app.post('/api/reports', authenticateToken, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Admin privileges required' });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const {
      title,
      description,
      category,
      priority,
      priority_level,
      location_lat,
      location_lng,
      location_address,
      images,
      assigned_group,
      can_cancel
    } = req.body || {};

    if (!title || !description || !category || !priority || typeof location_lat !== 'number' || typeof location_lng !== 'number') {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const payload = {
      user_id: userId,
      title: String(title).trim(),
      description: String(description).trim(),
      category: String(category),
      priority: String(priority),
      status: 'verifying',
      location: { lat: location_lat, lng: location_lng },
      location_address: location_address || `${location_lat}, ${location_lng}`,
      images: Array.isArray(images) ? images : [],
      priority_level: Number.isFinite(priority_level) ? priority_level : (priority === 'high' ? 5 : priority === 'medium' ? 3 : 1),
      assigned_group: assigned_group || null,
      can_cancel: can_cancel !== false
    };

    const { data, error } = await supabaseAdmin
      .from('reports')
      .insert([payload])
      .select('id, user_id, title, description, category, priority, status, location, location_address, images, created_at, updated_at, case_number, priority_level, assigned_group, assigned_patroller_name, can_cancel')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message || 'Failed to create report' });
    }

    res.json(data);
  } catch (e) {
    console.error('Create report error:', e);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// Activities: create via service role (JWT-protected)
app.post('/api/activities', authenticateToken, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Admin privileges required' });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { type, description, metadata } = req.body || {};
    if (!type || !description) {
      return res.status(400).json({ error: 'type and description are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('activities')
      .insert([
        {
          user_id: userId,
          type: String(type),
          description: String(description),
          metadata: metadata ?? null
        }
      ])
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message || 'Failed to create activity' });
    }
    res.json(data);
  } catch (e) {
    console.error('Create activity error:', e);
    res.status(500).json({ error: 'Failed to create activity' });
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
      responses.push({ 
        token: sub.token.substring(0, 20) + '...', 
        ok: !!resp.ok,
        error: resp.error || null
      });
      
      // If token is invalid, remove it from database
      if (!resp.ok && resp.error && (resp.error.includes('UNREGISTERED') || resp.error.includes('NOT_FOUND'))) {
        console.log('🗑️  Removing invalid token:', sub.token.substring(0, 20) + '...');
        await supabaseAdmin
          .from('push_subscriptions')
          .delete()
          .eq('token', sub.token);
      }
    }

    const successCount = responses.filter(r => r.ok).length;
    const errorCount = responses.filter(r => !r.ok).length;
    
    console.log(`📊 Push notification results: ${successCount} success, ${errorCount} failed`);
    res.json({ 
      ok: true, 
      total: responses.length,
      successful: successCount,
      failed: errorCount,
      responses
    });
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
    cors: 'configured',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Check admin online status
app.get('/api/admin/status', (req, res) => {
  try {
    const isAdminOnline = adminSockets.size > 0;
    res.json({
      success: true,
      isOnline: isAdminOnline,
      adminCount: adminSockets.size
    });
  } catch (error) {
    console.error('Admin status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check admin status'
    });
  }
});

// Test endpoint to check chat_messages table
app.get('/api/test/chat-messages', async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Admin privileges required' });
    }

    // Get all messages sent to admin (receiver_id = admin ID)
    const adminId = 'c5e7d75b-3f1b-4f85-b5a5-6b3786daea48'; // Admin user ID
    const { data: messages, error } = await supabaseAdmin
      .from('chat_messages')
      .select(`
        *,
        sender:profiles!sender_id(id, username, avatar_url, role),
        receiver:profiles!receiver_id(id, username, avatar_url, role)
      `)
      .eq('receiver_id', adminId)
      .order('created_at', { ascending: true });

    if (error) {
      return res.status(500).json({ 
        error: 'Database error', 
        details: error.message,
        code: error.code 
      });
    }

    res.json({ 
      success: true, 
      messageCount: messages?.length || 0,
      messages: messages || []
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'Test failed', 
      details: error.message 
    });
  }
});

// Admin: update user role (uses service role client, bypasses RLS)
app.put('/api/admin/users/:userId/role', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ success: false, error: 'Admin privileges required' });
    }

    const { userId } = req.params;
    const { role } = req.body || {};

    const allowedRoles = ['user', 'admin', 'patrol'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select('id, role')
      .maybeSingle();

    if (error) {
      return res.status(500).json({ success: false, error: error.message, code: error.code });
    }
    if (!data) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.json({ success: true, message: 'User role updated', user: data });
  } catch (e) {
    console.error('Admin update role error:', e);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Admin: toggle user ban status (uses service role client, bypasses RLS)
app.put('/api/admin/users/:userId/ban', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ success: false, error: 'Admin privileges required' });
    }

    const { userId } = req.params;
    const { is_banned } = req.body || {};

    if (typeof is_banned !== 'boolean') {
      return res.status(400).json({ success: false, error: 'is_banned must be boolean' });
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ is_banned })
      .eq('id', userId)
      .select('id, is_banned')
      .maybeSingle();

    if (error) {
      return res.status(500).json({ success: false, error: error.message, code: error.code });
    }
    if (!data) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.json({ success: true, message: `User ${is_banned ? 'banned' : 'unbanned'}`, user: data });
  } catch (e) {
    console.error('Admin toggle ban error:', e);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Admin: toggle announcement visibility (uses service role client, bypasses RLS)
app.put('/api/admin/announcements/:id/active', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ success: false, error: 'Admin privileges required' });
    }

    const { id } = req.params;
    const { is_active } = req.body || {};

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ success: false, error: 'is_active must be boolean' });
    }

    const { data, error } = await supabaseAdmin
      .from('announcements')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      return res.status(500).json({ success: false, error: error.message, code: error.code });
    }
    if (!data) {
      return res.status(404).json({ success: false, error: 'Announcement not found' });
    }

    return res.json({ success: true, announcement: data });
  } catch (e) {
    console.error('Admin toggle announcement active error:', e);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Admin: list announcements (bypasses RLS to include inactive/expired)
app.get('/api/admin/announcements', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ success: false, error: 'Admin privileges required' });
    }

    const { data, error } = await supabaseAdmin
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, error: error.message, code: error.code });
    }

    return res.json({ success: true, announcements: data || [] });
  } catch (e) {
    console.error('Admin list announcements error:', e);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Admin: update an announcement (bypasses RLS)
app.put('/api/admin/announcements/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ success: false, error: 'Admin privileges required' });
    }

    const { id } = req.params;
    const { title, content, image_url, priority, target_audience, expires_at } = req.body || {};

    const allowedPriorities = ['low', 'normal', 'high', 'urgent'];
    const allowedAudiences = ['all', 'users', 'patrols', 'admins'];

    const updateData = {};
    if (typeof title === 'string') updateData.title = title;
    if (typeof content === 'string') updateData.content = content;
    if (typeof image_url === 'string') updateData.image_url = image_url || null;
    if (typeof priority === 'string' && allowedPriorities.includes(priority)) updateData.priority = priority;
    if (typeof target_audience === 'string' && allowedAudiences.includes(target_audience)) updateData.target_audience = target_audience;
    if (expires_at === null || typeof expires_at === 'string') updateData.expires_at = expires_at;
    updateData.updated_at = new Date().toISOString();

    if (Object.keys(updateData).length === 1) { // only updated_at
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }

    const { data, error } = await supabaseAdmin
      .from('announcements')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      return res.status(500).json({ success: false, error: error.message, code: error.code });
    }
    if (!data) {
      return res.status(404).json({ success: false, error: 'Announcement not found' });
    }

    return res.json({ success: true, announcement: data });
  } catch (e) {
    console.error('Admin update announcement error:', e);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// API endpoint to get user's chat messages
app.get('/api/chat/messages/:userId', async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Admin privileges required' });
    }

    const { userId } = req.params;

    // Get messages where user is either sender or receiver
    const { data: messages, error } = await supabaseAdmin
      .from('chat_messages')
      .select(`
        *,
        sender:profiles!sender_id(id, username, avatar_url, role),
        receiver:profiles!receiver_id(id, username, avatar_url, role)
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: true });

    if (error) {
      return res.status(500).json({ 
        error: 'Database error', 
        details: error.message,
        code: error.code 
      });
    }

    res.json({ 
      success: true, 
      messages: messages || []
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch messages', 
      details: error.message 
    });
  }
});

// JWT Authentication Endpoints

// Login endpoint - authenticate user and generate JWT tokens
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Get user profile from Supabase
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, username, first_name, last_name, role, points, avatar_url')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch user profile',
        code: 'PROFILE_ERROR'
      });
    }

    // Generate JWT tokens
    const tokens = generateTokenPair({
      id: profile.id,
      email: profile.email,
      username: profile.username,
      role: profile.role || 'user'
    });

    res.json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        username: profile.username,
        first_name: profile.first_name,
        last_name: profile.last_name,
        role: profile.role || 'user',
        points: profile.points || 0,
        avatar_url: profile.avatar_url
      },
      tokens
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Refresh token endpoint
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required',
        code: 'MISSING_REFRESH_TOKEN'
      });
    }

    // Verify refresh token
    const decoded = verifyToken(refreshToken);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token type',
        code: 'INVALID_TOKEN_TYPE'
      });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, username, first_name, last_name, role, points, avatar_url')
      .eq('id', decoded.userId)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Generate new token pair
    const tokens = generateTokenPair({
      id: profile.id,
      email: profile.email,
      username: profile.username,
      role: profile.role || 'user'
    });

    res.json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        username: profile.username,
        first_name: profile.first_name,
        last_name: profile.last_name,
        role: profile.role || 'user',
        points: profile.points || 0,
        avatar_url: profile.avatar_url
      },
      tokens
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    
    if (error.message === 'Token has expired') {
      return res.status(401).json({
        success: false,
        error: 'Refresh token has expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    res.status(401).json({
      success: false,
      error: 'Invalid refresh token',
      code: 'INVALID_TOKEN'
    });
  }
});

// Get current user info (protected endpoint)
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, username, first_name, last_name, role, points, avatar_url')
      .eq('id', req.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({
        success: false,
        error: 'User profile not found',
        code: 'PROFILE_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        username: profile.username,
        first_name: profile.first_name,
        last_name: profile.last_name,
        role: profile.role || 'user',
        points: profile.points || 0,
        avatar_url: profile.avatar_url
      }
    });

  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Update user profile
app.put('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }

    const { avatar_url, username, first_name, last_name } = req.body;
    
    if (!supabaseAdmin) {
      return res.status(503).json({ 
        success: false,
        error: 'Admin privileges required' 
      });
    }

    // Build update object with only provided fields
    const updateData = {};
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
    if (username !== undefined) updateData.username = username;
    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'No valid fields to update' 
      });
    }

    // Add updated timestamp
    updateData.updated_at = new Date().toISOString();

    // Update profile in database
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select('id, email, username, first_name, last_name, role, points, avatar_url')
      .single();

    if (updateError) {
      console.error('Profile update error:', updateError);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to update profile',
        details: updateError.message 
      });
    }

    console.log(`Profile updated successfully for user ${userId}`);

    res.json({
      success: true,
      user: {
        id: updatedProfile.id,
        email: updatedProfile.email,
        username: updatedProfile.username,
        first_name: updatedProfile.first_name,
        last_name: updatedProfile.last_name,
        role: updatedProfile.role || 'user',
        points: updatedProfile.points || 0,
        avatar_url: updatedProfile.avatar_url
      },
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update profile',
      details: error.message 
    });
  }
});

// Logout endpoint
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    // In a more sophisticated implementation, you might want to blacklist the token
    // For now, we'll just return success since JWT tokens are stateless
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Generate JWT tokens for OAuth users
app.post('/api/auth/oauth-tokens', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
        code: 'MISSING_USER_ID'
      });
    }

    // Get user profile from Supabase
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, username, first_name, last_name, role, points, avatar_url')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({
        success: false,
        error: 'User profile not found',
        code: 'PROFILE_NOT_FOUND'
      });
    }

    // Generate JWT tokens
    const tokens = generateTokenPair({
      id: profile.id,
      email: profile.email,
      username: profile.username,
      role: profile.role || 'user'
    });

    res.json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        username: profile.username,
        first_name: profile.first_name,
        last_name: profile.last_name,
        role: profile.role || 'user',
        points: profile.points || 0,
        avatar_url: profile.avatar_url
      },
      tokens
    });

  } catch (error) {
    console.error('OAuth token generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Test protected endpoint
app.get('/api/auth/test', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Protected endpoint accessed successfully',
    user: req.user
  });
});

// Test admin-only endpoint
app.get('/api/auth/admin-test', authenticateToken, requireRole('admin'), (req, res) => {
  res.json({
    success: true,
    message: 'Admin endpoint accessed successfully',
    user: req.user
  });
});

// Email Verification Endpoints

// Send verification code
app.post('/api/auth/send-verification', async (req, res) => {
  // Set a maximum timeout for the entire request
  const requestTimeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        error: 'Request timeout. Please try again.',
        code: 'REQUEST_TIMEOUT'
      });
    }
  }, 30000); // 30 second timeout for the entire request

  try {
    // Validate request body
    if (!req.body || typeof req.body !== 'object') {
      clearTimeout(requestTimeout);
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        code: 'INVALID_BODY'
      });
    }

    const { email, username } = req.body;

    // Additional validation for email format
    if (email && typeof email === 'string' && !email.includes('@')) {
      clearTimeout(requestTimeout);
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
        code: 'INVALID_EMAIL_FORMAT'
      });
    }

    if (!email) {
      clearTimeout(requestTimeout);
      return res.status(400).json({
        success: false,
        error: 'Email is required',
        code: 'MISSING_EMAIL'
      });
    }

    // Rate limiting: max 3 attempts per email per 5 minutes
    const now = Date.now();
    const emailKey = email.toLowerCase();
    const attempts = emailVerificationAttempts.get(emailKey) || [];
    
    // Clean old attempts (older than 5 minutes)
    const recentAttempts = attempts.filter(timestamp => now - timestamp < 5 * 60 * 1000);
    
    if (recentAttempts.length >= 3) {
      clearTimeout(requestTimeout);
      return res.status(429).json({
        success: false,
        error: 'Too many verification attempts. Please wait 5 minutes before trying again.',
        code: 'RATE_LIMITED'
      });
    }

    // Add current attempt
    recentAttempts.push(now);
    emailVerificationAttempts.set(emailKey, recentAttempts);

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Set expiration time (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Clean up any existing verification codes for this email
    if (supabaseAdmin) {
      const { error: deleteError } = await supabaseAdmin
        .from('email_verifications')
        .delete()
        .eq('email', email);
      
      if (deleteError) {
        console.warn('Warning: Could not delete existing verification codes:', deleteError);
      }
    }

    // Send verification email with improved strategy
    let emailSent = false;
    let emailServiceUsed = '';
    
    // Try Gmail first with shorter timeout for faster fallback
    try {
      const gmailPromise = gmailEmailService.sendVerificationEmail(email, verificationCode, username || 'User');
      const gmailTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Gmail timeout')), 6000) // Reduced to 6 seconds for faster fallback
      );
      
      emailSent = await Promise.race([gmailPromise, gmailTimeout]);
      if (emailSent) {
        console.log('✅ Email sent via Gmail SMTP');
        emailServiceUsed = 'Gmail';
      }
    } catch (gmailError) {
      console.log('⚠️  Gmail sending failed, trying Brevo...', gmailError.message);
    }
    
    // If Gmail failed, try Brevo with timeout
    if (!emailSent) {
      try {
        const brevoPromise = emailService.sendVerificationEmail(email, verificationCode, username || 'User');
        const brevoTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Brevo timeout')), 6000) // 6 second timeout
        );
        
        emailSent = await Promise.race([brevoPromise, brevoTimeout]);
        if (emailSent) {
          console.log('✅ Email sent via Brevo');
          emailServiceUsed = 'Brevo';
        }
      } catch (brevoError) {
        console.log('⚠️  Brevo sending failed:', brevoError.message);
      }
    }

    // Allow verification to continue even if email sending fails
    // This ensures the registration process doesn't break when email services are not configured
    let devBypass = false;
    if (!emailSent) {
      console.warn('⚠️  Email not sent, but continuing with verification code:', verificationCode);
      console.warn('⚠️  Gmail and Brevo both failed - using fallback mode');
      console.warn('⚠️  To enable email sending, check Gmail credentials and activate Brevo SMTP account');
      console.warn('⚠️  Contact contact@brevo.com to activate Brevo SMTP account');
      devBypass = true;
      emailSent = true;
    } else {
      console.log(`✅ Email successfully sent via ${emailServiceUsed}`);
    }

    // Only insert verification code if email was sent successfully
    const { data: verificationData, error: insertError } = await supabaseAdmin
      ? await supabaseAdmin
          .from('email_verifications')
          .insert({
            email,
            code: verificationCode,
            attempts: 0,
            max_attempts: 5,
            expires_at: expiresAt
          })
          .select()
          .single()
      : await supabase
          .from('email_verifications')
          .insert({
            email,
            code: verificationCode,
            attempts: 0,
            max_attempts: 5,
            expires_at: expiresAt
          })
          .select()
          .single();

    if (insertError) {
      clearTimeout(requestTimeout);
      console.error('Error inserting verification code:', insertError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create verification code',
        code: 'DATABASE_ERROR'
      });
    }

    // Clear the request timeout since we're responding successfully
    clearTimeout(requestTimeout);
    
    res.json({
      success: true,
      message: devBypass 
        ? `Verification code generated successfully (${emailServiceUsed ? emailServiceUsed + ' failed' : 'email service unavailable'})` 
        : `Verification code sent successfully via ${emailServiceUsed}`,
      expiresAt,
      // Always expose code when email services fail to ensure registration can continue
      code: devBypass ? verificationCode : undefined,
      emailService: emailServiceUsed || 'fallback'
    });

  } catch (error) {
    // Clear the request timeout since we're responding with an error
    clearTimeout(requestTimeout);
    
    console.error('Send verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Verify email code
app.post('/api/auth/verify-email', async (req, res) => {
  try {
    // Validate request body exists and is an object
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        code: 'INVALID_BODY'
      });
    }

    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        error: 'Email and verification code are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Find the verification record
    const { data: verification, error: fetchError } = await supabaseAdmin
      ? await supabaseAdmin
          .from('email_verifications')
          .select('*')
          .eq('email', email)
          .eq('code', code)
          .single()
      : await supabase
          .from('email_verifications')
          .select('*')
          .eq('email', email)
          .eq('code', code)
          .single();

    if (fetchError || !verification) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification code',
        code: 'INVALID_CODE'
      });
    }

    // Check if code is expired
    if (new Date(verification.expires_at) < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Verification code has expired',
        code: 'CODE_EXPIRED'
      });
    }

    // Check if already verified
    if (verification.verified_at) {
      return res.status(400).json({
        success: false,
        error: 'Email already verified',
        code: 'ALREADY_VERIFIED'
      });
    }

    // Check attempt limit
    if (verification.attempts >= verification.max_attempts) {
      return res.status(400).json({
        success: false,
        error: 'Too many verification attempts',
        code: 'TOO_MANY_ATTEMPTS'
      });
    }

    // Mark as verified
    const { error: updateError } = await supabaseAdmin
      ? await supabaseAdmin
          .from('email_verifications')
          .update({
            verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', verification.id)
      : await supabase
          .from('email_verifications')
          .update({
            verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', verification.id);

    if (updateError) {
      console.error('Error updating verification:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify email',
        code: 'UPDATE_ERROR'
      });
    }

    res.json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Check verification status
app.get('/api/auth/verification-status/:email', async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
        code: 'MISSING_EMAIL'
      });
    }

    // Find the verification record
    const { data: verification, error: fetchError } = await supabaseAdmin
      ? await supabaseAdmin
          .from('email_verifications')
          .select('*')
          .eq('email', email)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
      : await supabase
          .from('email_verifications')
          .select('*')
          .eq('email', email)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

    if (fetchError || !verification) {
      return res.json({
        success: true,
        verified: false,
        message: 'No verification record found'
      });
    }

    const isVerified = !!verification.verified_at;
    const isExpired = new Date(verification.expires_at) < new Date();

    res.json({
      success: true,
      verified: isVerified,
      expired: isExpired,
      attempts: verification.attempts,
      maxAttempts: verification.max_attempts,
      expiresAt: verification.expires_at
    });

  } catch (error) {
    console.error('Check verification status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Reports: like/unlike using service role (supports JWT-authenticated users)
app.post('/api/reports/:reportId/likes', authenticateToken, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ success: false, error: 'Admin privileges required' });
    }

    const { reportId } = req.params;
    const userId = req.user.id;

    // Upsert-like behavior: ensure unique (report_id, user_id)
    const { error } = await supabaseAdmin
      .from('likes')
      .upsert({ report_id: reportId, user_id: userId }, { onConflict: 'report_id,user_id', ignoreDuplicates: false });

    if (error) {
      return res.status(500).json({ success: false, error: error.message, code: error.code });
    }

    return res.json({ success: true, liked: true });
  } catch (e) {
    console.error('Like report error:', e);
    return res.status(500).json({ success: false, error: 'Failed to like report' });
  }
});

app.delete('/api/reports/:reportId/likes', authenticateToken, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ success: false, error: 'Admin privileges required' });
    }

    const { reportId } = req.params;
    const userId = req.user.id;

    const { error } = await supabaseAdmin
      .from('likes')
      .delete()
      .eq('report_id', reportId)
      .eq('user_id', userId);

    if (error) {
      return res.status(500).json({ success: false, error: error.message, code: error.code });
    }

    return res.json({ success: true, liked: false });
  } catch (e) {
    console.error('Unlike report error:', e);
    return res.status(500).json({ success: false, error: 'Failed to unlike report' });
  }
});

// Toggle like (server decides insert/delete based on current state)
app.post('/api/reports/:reportId/likes/toggle', authenticateToken, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ success: false, error: 'Admin privileges required' });
    }

    const { reportId } = req.params;
    const userId = req.user.id;

    // Check existing
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('likes')
      .select('id')
      .eq('report_id', reportId)
      .eq('user_id', userId)
      .maybeSingle();

    if (checkError) {
      return res.status(500).json({ success: false, error: checkError.message, code: checkError.code });
    }

    if (existing) {
      const { error: delErr } = await supabaseAdmin
        .from('likes')
        .delete()
        .eq('id', existing.id);
      if (delErr) {
        return res.status(500).json({ success: false, error: delErr.message, code: delErr.code });
      }
      return res.json({ success: true, liked: false });
    }

    const { error: insErr } = await supabaseAdmin
      .from('likes')
      .insert({ report_id: reportId, user_id: userId });
    if (insErr) {
      return res.status(500).json({ success: false, error: insErr.message, code: insErr.code });
    }
    return res.json({ success: true, liked: true });
  } catch (e) {
    console.error('Toggle like error:', e);
    return res.status(500).json({ success: false, error: 'Failed to toggle like' });
  }
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

// Profile update endpoint
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { avatar_url, username, first_name, last_name } = req.body;
    
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Admin privileges required' });
    }

    // Build update object with only provided fields
    const updateData = {};
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
    if (username !== undefined) updateData.username = username;
    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Add updated timestamp
    updateData.updated_at = new Date().toISOString();

    // Update profile in database
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Profile update error:', updateError);
      return res.status(500).json({ 
        error: 'Failed to update profile',
        details: updateError.message 
      });
    }

    console.log(`Profile updated successfully for user ${userId}`);

    res.json({
      success: true,
      user: updatedProfile,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ 
      error: 'Failed to update profile',
      details: error.message 
    });
  }
});

// Avatar upload endpoint
app.post('/api/upload/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    const { userId } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Verify the user is uploading for themselves
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Unauthorized: You can only upload avatars for yourself' });
    }
    
    // Upload to Supabase storage using admin client
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Admin privileges required' });
    }
    
    // Create a unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const fileExt = file.originalname.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${timestamp}-${random}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;
    
    // Upload to Supabase storage
    const { error: uploadError, data: uploadData } = await supabaseAdmin.storage
      .from('avatars')
      .upload(filePath, file.buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.mimetype
      });
    
    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return res.status(500).json({ 
        error: 'Failed to upload avatar',
        details: uploadError.message 
      });
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(filePath);
    
    // Update user profile with new avatar URL
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', userId);
    
    if (updateError) {
      console.error('Profile update error:', updateError);
      return res.status(500).json({ 
        error: 'Failed to update profile',
        details: updateError.message 
      });
    }
    
    console.log(`Avatar uploaded successfully for user ${userId}: ${publicUrl}`);
    
    res.json({
      success: true,
      avatarUrl: publicUrl,
      message: 'Avatar uploaded successfully'
    });
    
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload avatar',
      details: error.message 
    });
  }
});

// Performance monitoring
const performanceMetrics = {
  connectionsActive: 0,
  averageResponseTime: 0,
  startTime: Date.now(),
  responseTimes: []
};

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
  
  // Calculate average response time from recent samples
  const recentResponseTimes = performanceMetrics.responseTimes.slice(-10); // Last 10 samples
  const avgResponseTime = recentResponseTimes.length > 0 
    ? Math.round(recentResponseTimes.reduce((a, b) => a + b, 0) / recentResponseTimes.length)
    : 0;
  
  res.json({
    uptime,
    connectionsActive: performanceMetrics.connectionsActive,
    averageResponseTime: avgResponseTime
  });
});



// General error handling
// Global error handler with better JSON error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Handle JSON parsing errors specifically
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ 
      success: false,
      error: 'Invalid JSON format in request body',
      code: 'INVALID_JSON'
    });
  }
  
  // Handle other errors
  res.status(500).json({ 
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

// Set default environment
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

const PORT = process.env.PORT || 3001;

// Socket.IO connection handling
const connectedUsers = new Map(); // userId -> socketId
const adminSockets = new Set(); // Set of admin socket IDs

// Helper: send push to a specific user via FCM v1
const sendPushToUser = async (userId, title, body, link) => {
  try {
    if (!supabaseAdmin) {
      console.warn('⚠️  No Supabase admin client available for push notifications');
      return { sent: 0, failed: 0 };
    }
    
    const { data: subs, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('token')
      .eq('user_id', userId);
      
    if (error) {
      console.error('Error fetching push subscriptions:', error);
      throw error;
    }

    if (!subs || subs.length === 0) {
      console.log(`📱 No push subscriptions found for user ${userId}`);
      return { sent: 0, failed: 0 };
    }

    console.log(`📱 Found ${subs.length} push subscription(s) for user ${userId}`);
    
    let sent = 0;
    let failed = 0;
    
    for (const sub of subs) {
      const result = await sendFcmV1ToToken(sub.token, title, body, link);
      
      if (result.ok) {
        sent++;
        console.log(`✅ Push notification sent successfully to token ${sub.token.substring(0, 20)}...`);
      } else {
        failed++;
        console.error(`❌ Push notification failed for token ${sub.token.substring(0, 20)}...:`, result.error);
        
        // If token is invalid, remove it from database
        if (result.error && (result.error.includes('UNREGISTERED') || result.error.includes('NOT_FOUND'))) {
          console.log(`🗑️  Removing invalid token from database: ${sub.token.substring(0, 20)}...`);
          await supabaseAdmin
            .from('push_subscriptions')
            .delete()
            .eq('token', sub.token);
        }
      }
    }
    
    console.log(`📊 Push notification results for user ${userId}: ${sent} sent, ${failed} failed`);
    return { sent, failed };
    
  } catch (err) {
    console.error('sendPushToUser error:', err);
    return { sent: 0, failed: 0, error: err.message };
  }
};

// Send push notification for chat messages
const sendChatPushNotification = async (message, senderRole) => {
  try {
    const { sender, receiver } = message;
    const isFromAdmin = senderRole === 'admin';
    
    // Always send notification to the receiver (not the sender)
    const targetUserId = message.receiver_id;
    
    // Don't send push notification to the sender
    if (targetUserId === message.sender_id) {
      return;
    }

    // Create notification title and body based on who is sending
    const senderName = sender?.username || (isFromAdmin ? 'Admin' : 'User');
    const title = isFromAdmin ? 'New message from Admin' : 'New message from User';
    const body = `${senderName}: ${message.message}`;
    
    // Determine the correct link based on the receiver's role
    // If receiver is admin, link to admin chat; if receiver is user, link to user chat
    const receiverRole = receiver?.role;
    const link = receiverRole === 'admin' ? '/admin/chat' : '/chat';

    // Send push notification
    await sendPushToUser(targetUserId, title, body, link);

    // Also create a notification record in the database
    console.log('Creating notification for user:', targetUserId);
    const { error: notificationError } = await supabaseAdmin
      ? supabaseAdmin.from('notifications').insert({
          user_id: targetUserId,
          title,
          message: body,
          type: 'chat',
          link,
          created_at: new Date().toISOString()
        })
      : supabase.from('notifications').insert({
          user_id: targetUserId,
          title,
          message: body,
          type: 'chat',
          link,
          created_at: new Date().toISOString()
        });

    if (notificationError) {
      console.error('Failed to create chat notification record:', notificationError);
    } else {
      console.log('✅ Chat notification created successfully for user:', targetUserId);
    }

    console.log(`Chat push notification sent to user ${targetUserId} (${receiverRole})`);
  } catch (error) {
    console.error('Error sending chat push notification:', error);
  }
};

io.on('connection', async (socket) => {
  console.log('Socket connected:', socket.id);

  // Authenticate user
  socket.on('authenticate', async (data) => {
    try {
      console.log('Received authentication request from socket:', socket.id);
      
      const { token, userId, username, role } = data;
      
      // Try JWT authentication first
      if (token) {
        console.log('Attempting JWT authentication...');
        try {
          const decoded = verifyToken(token);
          if (decoded) {
            console.log('JWT token verified, fetching user profile for:', decoded.userId);

            // Get user profile
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('id, username, role, avatar_url')
              .eq('id', decoded.userId)
              .single();

            if (profileError || !profile) {
              console.log('User profile not found:', profileError?.message);
              socket.emit('auth_error', { error: 'User not found' });
              return;
            }

            console.log('User profile found:', profile.username, profile.role);

            // Store user connection
            connectedUsers.set(profile.id, socket.id);
            socket.userId = profile.id;
            socket.userRole = profile.role;

            // If user is admin, add to admin sockets
            if (profile.role === 'admin') {
              adminSockets.add(socket.id);
              // Notify all users that admin is online
              io.emit('admin_online', { isOnline: true });
              console.log('Admin user connected, notifying all users');
            }

            socket.emit('authenticated', { 
              success: true, 
              user: profile 
            });

            // Send current admin status to the newly connected user
            socket.emit('admin_online', { isOnline: adminSockets.size > 0 });

            console.log(`User ${profile.username} (${profile.role}) authenticated successfully via JWT`);
            return;
          }
        } catch (jwtError) {
          console.log('JWT authentication failed:', jwtError.message);
          // Fall through to fallback authentication
        }
      }
      
      // Fallback authentication for testing (remove in production)
      if (userId && username && role) {
        console.log('Using fallback authentication for testing...');
        
        // Store user connection
        connectedUsers.set(userId, socket.id);
        socket.userId = userId;
        socket.userRole = role;

        // If user is admin, add to admin sockets
        if (role === 'admin') {
          adminSockets.add(socket.id);
          // Notify all users that admin is online
          io.emit('admin_online', { isOnline: true });
          console.log('Admin user connected, notifying all users');
        }

        socket.emit('authenticated', { 
          success: true, 
          user: { id: userId, username, role, avatar_url: null }
        });

        // Send current admin status to the newly connected user
        socket.emit('admin_online', { isOnline: adminSockets.size > 0 });

        console.log(`User ${username} (${role}) authenticated successfully via fallback`);
        return;
      }

      console.log('No valid authentication method provided');
      socket.emit('auth_error', { error: 'No valid authentication provided' });

    } catch (error) {
      console.error('Socket authentication error:', error);
      socket.emit('auth_error', { error: error.message || 'Authentication failed' });
    }
  });

  // Join admin chat
  socket.on('join_admin_chat', async (data) => {
    try {
      console.log('Join admin chat request:', { socketUserId: socket.userId, socketUserRole: socket.userRole, requestedUserId: data.userId });
      
      if (!socket.userId) {
        console.log('No socket.userId, emitting chat_error');
        socket.emit('chat_error', { error: 'Not authenticated' });
        return;
      }

      const { userId } = data;
      
      // Verify user can join this chat
      // Users can join their own admin chat, admins can join any admin chat
      if (socket.userId !== userId && socket.userRole !== 'admin') {
        console.log('Unauthorized: socket.userId !== userId && socket.userRole !== admin');
        console.log(`socket.userId: ${socket.userId}, userId: ${userId}, socket.userRole: ${socket.userRole}`);
        socket.emit('chat_error', { error: 'Unauthorized - you can only join your own admin chat' });
        return;
      }

      console.log('Authorization passed, joining chat room');
      socket.join(`admin_chat_${userId}`);
      socket.emit('chat_connected', { 
        success: true, 
        message: 'Joined admin chat' 
      });

      console.log(`User ${socket.userId} (${socket.userRole}) joined admin chat for user ${userId}`);

    } catch (error) {
      console.error('Join admin chat error:', error);
      socket.emit('chat_error', { error: 'Failed to join chat' });
    }
  });

  // Send message
  socket.on('send_message', async (data) => {
    try {
      console.log('Send message request:', { socketUserId: socket.userId, socketUserRole: socket.userRole, data });
      
      if (!socket.userId) {
        console.log('Send message: No socket.userId, emitting chat_error');
        socket.emit('chat_error', { error: 'Not authenticated' });
        return;
      }

      const { message, receiverId } = data;
      
      if (!message || !receiverId) {
        console.log('Send message: Missing message or receiverId');
        socket.emit('chat_error', { error: 'Message and receiver ID required' });
        return;
      }

      // Verify user can send message to this receiver
      // Users can send to admins (for admin chat), admins can send to anyone, users can send to themselves
      if (socket.userId !== receiverId && socket.userRole !== 'admin') {
        // Check if this is an admin chat (user sending to admin)
        // For now, allow any message from regular users (they're in admin chat)
        if (socket.userRole === 'user') {
          console.log('Send message: Regular user sending message in admin chat - allowing');
        } else {
          console.log('Send message: Unauthorized - socket.userId !== receiverId && socket.userRole !== admin');
          console.log(`socket.userId: ${socket.userId}, receiverId: ${receiverId}, socket.userRole: ${socket.userRole}`);
          socket.emit('chat_error', { error: 'Unauthorized' });
          return;
        }
      }

      // Handle admin messages - use known admin user ID
      let actualReceiverId = receiverId;
      if (receiverId === 'admin-placeholder' || receiverId === 'admin') {
        // Use the known admin user ID
        actualReceiverId = 'c5e7d75b-3f1b-4f85-b5a5-6b3786daea48';
        console.log('Using admin user ID:', actualReceiverId);
      }

      // Create message in database
      console.log('Creating message in database with:', {
        sender_id: socket.userId,
        receiver_id: actualReceiverId,
        message: message,
        message_type: 'text',
        is_read: false
      });

      const { data: newMessage, error: messageError } = await supabaseAdmin
        .from('chat_messages')
        .insert({
          sender_id: socket.userId,
          receiver_id: actualReceiverId,
          message: message,
          message_type: 'text',
          is_read: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select(`
          *,
          sender:profiles!sender_id(id, username, avatar_url, role),
          receiver:profiles!receiver_id(id, username, avatar_url, role)
        `)
        .single();

      console.log('Database insert result:', { newMessage, messageError });

      if (messageError) {
        console.error('Message creation error:', messageError);
        socket.emit('chat_error', { error: 'Failed to send message' });
        return;
      }

      // Emit message to sender
      socket.emit('message_sent', newMessage);

      // Emit message to receiver
      const receiverSocketId = connectedUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('message_received', newMessage);
      }

      // If this is an admin chat, notify admin
      if (socket.userRole !== 'admin') {
        adminSockets.forEach(adminSocketId => {
          io.to(adminSocketId).emit('message_received', newMessage);
        });
      }

      // Send push notification for chat message
      try {
        console.log('🔔 Attempting to send chat push notification...');
        console.log('   Message details:', {
          id: newMessage.id,
          sender_id: newMessage.sender_id,
          receiver_id: newMessage.receiver_id,
          message: newMessage.message.substring(0, 50) + '...'
        });
        await sendChatPushNotification(newMessage, socket.userRole);
        console.log('✅ Chat push notification sent successfully');
      } catch (pushError) {
        console.error('❌ Failed to send chat push notification:', pushError);
        console.error('   Push error details:', pushError.message || pushError);
      }

      console.log(`Message sent from ${socket.userId} to ${receiverId}`);

    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('chat_error', { error: 'Failed to send message' });
    }
  });

  // Mark messages as read
  socket.on('mark_messages_read', async (data) => {
    try {
      if (!socket.userId) {
        socket.emit('chat_error', { error: 'Not authenticated' });
        return;
      }

      const { messageIds } = data;
      
      if (!messageIds || !Array.isArray(messageIds)) {
        socket.emit('chat_error', { error: 'Message IDs required' });
        return;
      }

      // Update messages as read
      const { error: updateError } = await supabaseAdmin
        .from('chat_messages')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .in('id', messageIds)
        .eq('receiver_id', socket.userId);

      if (updateError) {
        console.error('Mark messages read error:', updateError);
        socket.emit('chat_error', { error: 'Failed to mark messages as read' });
        return;
      }

      socket.emit('messages_read', { messageIds });

    } catch (error) {
      console.error('Mark messages read error:', error);
      socket.emit('chat_error', { error: 'Failed to mark messages as read' });
    }
  });

  // Mark messages as seen by admin (double checkmark)
  socket.on('mark_messages_seen', async (data) => {
    try {
      if (!socket.userId) {
        socket.emit('chat_error', { error: 'Not authenticated' });
        return;
      }

      // Check if user is admin
      if (socket.userRole !== 'admin') {
        socket.emit('chat_error', { error: 'Admin access required' });
        return;
      }

      const { messageIds } = data;
      
      if (!messageIds || !Array.isArray(messageIds)) {
        socket.emit('chat_error', { error: 'Message IDs required' });
        return;
      }

      // Update messages as seen by admin using the database function
      const { error: updateError } = await supabaseAdmin
        .rpc('mark_messages_as_seen', {
          message_ids: messageIds,
          admin_user_id: socket.userId
        });

      if (updateError) {
        console.error('Mark messages seen error:', updateError);
        socket.emit('chat_error', { error: 'Failed to mark messages as seen' });
        return;
      }

      // Get the updated messages to send back to users
      const { data: updatedMessages, error: fetchError } = await supabaseAdmin
        .from('chat_messages')
        .select(`
          *,
          sender:profiles!chat_messages_sender_id_fkey(id, username, avatar_url, role),
          receiver:profiles!chat_messages_receiver_id_fkey(id, username, avatar_url, role)
        `)
        .in('id', messageIds);

      if (fetchError) {
        console.error('Fetch updated messages error:', fetchError);
      } else {
        // Notify the sender of each message that their message was seen
        updatedMessages?.forEach(message => {
          const senderSocketId = connectedUsers.get(message.sender_id);
          if (senderSocketId) {
            io.to(senderSocketId).emit('message_seen', { 
              messageId: message.id,
              seenAt: message.seen_at,
              isRead: message.is_read
            });
          }
        });
      }

      socket.emit('messages_seen', { messageIds });

    } catch (error) {
      console.error('Mark messages seen error:', error);
      socket.emit('chat_error', { error: 'Failed to mark messages as seen' });
    }
  });

  // Typing indicators
  socket.on('typing_start', (data) => {
    if (!socket.userId) return;
    
    const { receiverId } = data;
    const receiverSocketId = connectedUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('user_typing', { 
        userId: socket.userId, 
        isTyping: true 
      });
    }
  });

  socket.on('typing_stop', (data) => {
    if (!socket.userId) return;
    
    const { receiverId } = data;
    const receiverSocketId = connectedUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('user_typing', { 
        userId: socket.userId, 
        isTyping: false 
      });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
    
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      
      // If admin disconnected, notify users
      if (socket.userRole === 'admin') {
        adminSockets.delete(socket.id);
        if (adminSockets.size === 0) {
          io.emit('admin_online', { isOnline: false });
        }
      }
    }
  });
});

// Start server after testing Supabase connection
const startServer = async () => {
  try {
    await testSupabaseConnection();
    
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log('\n✅ Server is ready!');
    });

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
