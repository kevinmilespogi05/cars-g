/**
 * Lazy Loader for Serverless Optimization
 * 
 * This module implements lazy loading patterns to minimize cold start times
 * by only loading heavy dependencies when actually needed.
 */

// Cache for loaded modules to avoid re-importing
const moduleCache = new Map();

/**
 * Lazy load heavy dependencies only when needed
 */
export const lazyLoad = {
  // Supabase client - only load when database operations are needed
  supabase: null,
  getSupabase() {
    if (!this.supabase) {
      const { createClient } = require('@supabase/supabase-js');
      this.supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
    }
    return this.supabase;
  },

  // Google Auth - only load for FCM operations
  googleAuth: null,
  async getGoogleAuth() {
    if (!this.googleAuth) {
      const { GoogleAuth } = await import('google-auth-library');
      this.googleAuth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/firebase.messaging']
      });
    }
    return this.googleAuth;
  },

  // Multer - only load for file upload endpoints
  multer: null,
  getMulter() {
    if (!this.multer) {
      const multer = require('multer');
      this.multer = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: 10 * 1024 * 1024 } // 10MB
      });
    }
    return this.multer;
  },

  // JWT utilities - only load for auth operations
  jwt: null,
  getJWT() {
    if (!this.jwt) {
      this.jwt = require('jsonwebtoken');
    }
    return this.jwt;
  },

  // Crypto - only load when needed for hashing/encryption
  crypto: null,
  getCrypto() {
    if (!this.crypto) {
      this.crypto = require('crypto');
    }
    return this.crypto;
  }
};

/**
 * Conditional middleware loader
 * Only applies middleware if the route pattern matches
 */
export function conditionalMiddleware(pattern, middleware) {
  return (req, res, next) => {
    if (req.path.match(pattern)) {
      return middleware(req, res, next);
    }
    next();
  };
}

/**
 * Lazy route handler
 * Only loads the handler function when the route is accessed
 */
export function lazyRoute(handlerPath) {
  return async (req, res, next) => {
    try {
      let handler = moduleCache.get(handlerPath);
      
      if (!handler) {
        const module = await import(handlerPath);
        handler = module.default || module;
        moduleCache.set(handlerPath, handler);
      }
      
      return handler(req, res, next);
    } catch (error) {
      console.error(`Failed to load route handler: ${handlerPath}`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Minimal health check that loads almost nothing
 */
export function minimalHealthCheck(req, res) {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
  });
}

/**
 * Smart dependency preloader
 * Preloads commonly used dependencies in the background after startup
 */
export function preloadCommonDependencies() {
  // Use setImmediate to load after the event loop is free
  setImmediate(async () => {
    try {
      // Preload most commonly used modules
      await Promise.allSettled([
        import('@supabase/supabase-js'),
        import('jsonwebtoken')
      ]);
      
      console.log('✅ Common dependencies preloaded');
    } catch (error) {
      console.log('⚠️  Dependency preload failed (non-critical):', error.message);
    }
  });
}

/**
 * Memory-efficient error handler
 */
export function lightweightErrorHandler(error, req, res, next) {
  // Don't load heavy logging libraries for simple errors
  const statusCode = error.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : error.message;

  res.status(statusCode).json({
    error: message,
    timestamp: new Date().toISOString()
  });
}

/**
 * Route-specific optimization helpers
 */
export const optimizedRoutes = {
  // Ultra-fast health check
  health: minimalHealthCheck,
  
  // Lightweight status endpoint
  status(req, res) {
    res.json({
      status: 'running',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    });
  },
  
  // Optimized CORS preflight handler
  preflight(req, res) {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.header('Access-Control-Max-Age', '86400'); // Cache for 24 hours
    res.status(204).end();
  }
};

/**
 * Bundle size analyzer for development
 */
export function analyzeBundleSize() {
  if (process.env.NODE_ENV !== 'development') return;
  
  const modules = Object.keys(require.cache);
  const sizes = modules.map(mod => {
    try {
      const stats = require('fs').statSync(mod);
      return { module: mod, size: stats.size };
    } catch {
      return { module: mod, size: 0 };
    }
  });
  
  const totalSize = sizes.reduce((sum, item) => sum + item.size, 0);
  console.log(`📦 Bundle analysis: ${modules.length} modules, ${Math.round(totalSize / 1024)}KB total`);
  
  // Show largest modules
  const largest = sizes
    .sort((a, b) => b.size - a.size)
    .slice(0, 5)
    .filter(item => item.size > 0);
    
  console.log('🔍 Largest modules:');
  largest.forEach(item => {
    const name = item.module.split('/').pop();
    console.log(`  ${name}: ${Math.round(item.size / 1024)}KB`);
  });
}

