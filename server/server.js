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
import { generateTokenPair, verifyToken, extractTokenFromHeader } from './lib/jwt.js';
import { authenticateToken, requireRole } from './middleware/auth.js';

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

    // Check if table exists and get sample data with sender information
    const { data: messages, error } = await supabaseAdmin
      .from('chat_messages')
      .select(`
        *,
        sender:profiles!sender_id(id, username, avatar_url, role),
        receiver:profiles!receiver_id(id, username, avatar_url, role)
      `)
      .limit(5);

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
      .select('id, email, username, role, points, avatar_url')
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
      .select('id, email, username, role, points, avatar_url')
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
      .select('id, email, username, role, points, avatar_url')
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
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
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
