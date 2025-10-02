/**
 * Optimized Server for Minimal Cold Start Times
 * 
 * This version loads only essential modules at startup and lazy-loads
 * everything else when needed. Perfect for serverless/free hosting.
 */

// Only load absolutely essential modules at startup
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';

// Our optimized lazy loader
import { 
  lazyLoad, 
  conditionalMiddleware, 
  lazyRoute, 
  optimizedRoutes,
  preloadCommonDependencies,
  lightweightErrorHandler,
  analyzeBundleSize
} from './lib/lazy-loader.js';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Minimal startup time tracking
const startTime = Date.now();

// Essential middleware only (loaded immediately)
app.use(compression()); // Fast compression
app.use(express.json({ limit: '10mb' })); // JSON parsing

// Optimized CORS - minimal configuration
app.use(cors({
  origin: true, // Allow all origins for simplicity
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  maxAge: 86400 // Cache CORS for 24 hours
}));

// Ultra-fast health check (no dependencies)
app.get('/health', optimizedRoutes.health);

// Lightweight status endpoint
app.get('/api/status', optimizedRoutes.status);

// Fast OPTIONS handler for CORS preflight
app.options('*', optimizedRoutes.preflight);

// Lazy-loaded routes (only load handlers when accessed)

// Auth routes - only load JWT when needed
app.post('/api/auth/login', conditionalMiddleware(/^\/api\/auth/, (req, res, next) => {
  // Load auth middleware only for auth routes
  const jwt = lazyLoad.getJWT();
  next();
}), lazyRoute('./routes/auth.js'));

app.get('/api/auth/me', lazyRoute('./routes/auth.js'));

// Reports routes - only load Supabase when needed
app.get('/api/reports', (req, res, next) => {
  // Lazy load Supabase client
  req.supabase = lazyLoad.getSupabase();
  next();
}, lazyRoute('./routes/reports.js'));

app.post('/api/reports', (req, res, next) => {
  req.supabase = lazyLoad.getSupabase();
  next();
}, lazyRoute('./routes/reports.js'));

// Upload routes - only load Multer when needed
app.post('/api/upload/*', (req, res, next) => {
  const upload = lazyLoad.getMulter();
  upload.single('file')(req, res, next);
}, lazyRoute('./routes/upload.js'));

// Push notification routes - only load Google Auth when needed
app.post('/api/push/register', async (req, res, next) => {
  req.googleAuth = await lazyLoad.getGoogleAuth();
  next();
}, lazyRoute('./routes/push.js'));

// Socket.IO - lazy load only when WebSocket upgrade is requested
let io = null;
server.on('upgrade', async (request, socket, head) => {
  if (!io) {
    console.log('🔌 Lazy loading Socket.IO...');
    const { Server } = await import('socket.io');
    io = new Server(server, {
      cors: { origin: true, credentials: true },
      transports: ['websocket', 'polling']
    });
    
    // Load socket handlers
    const socketHandlers = await import('./socket-handlers.js');
    socketHandlers.setupSocketHandlers(io);
  }
});

// Lightweight error handler
app.use(lightweightErrorHandler);

// 404 handler (minimal)
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    path: req.originalUrl 
  });
});

// Optimized server startup
async function startOptimizedServer() {
  try {
    // Start server immediately without heavy initialization
    server.listen(PORT, () => {
      const bootTime = Date.now() - startTime;
      console.log(`🚀 Optimized server started in ${bootTime}ms`);
      console.log(`📡 Port: ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      
      // Analyze bundle size in development
      if (process.env.NODE_ENV === 'development') {
        analyzeBundleSize();
      }
      
      // Preload common dependencies in background (non-blocking)
      preloadCommonDependencies();
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🛑 Graceful shutdown initiated');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

// Start the optimized server
startOptimizedServer();

export { app, server };

