/**
 * Lightweight Caching Middleware
 * 
 * Implements in-memory caching for API responses to reduce database load
 * and improve response times during cold starts.
 */

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes default

/**
 * Cache middleware factory
 */
export function createCacheMiddleware(options = {}) {
  const {
    ttl = CACHE_TTL,
    keyGenerator = (req) => `${req.method}:${req.path}:${JSON.stringify(req.query)}`,
    shouldCache = (req, res) => req.method === 'GET' && res.statusCode === 200,
    maxSize = 100 // Maximum number of cached entries
  } = options;

  return (req, res, next) => {
    const cacheKey = keyGenerator(req);
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < ttl) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-TTL', Math.round((ttl - (Date.now() - cached.timestamp)) / 1000));
      return res.json(cached.data);
    }

    // Override res.json to cache the response
    const originalJson = res.json;
    res.json = function(data) {
      // Cache the response if conditions are met
      if (shouldCache(req, res)) {
        // Implement simple LRU by removing oldest entries
        if (cache.size >= maxSize) {
          const firstKey = cache.keys().next().value;
          cache.delete(firstKey);
        }
        
        cache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
        
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Cache-TTL', Math.round(ttl / 1000));
      }
      
      return originalJson.call(this, data);
    };

    next();
  };
}

/**
 * Predefined cache configurations
 */
export const cacheConfigs = {
  // Short-term cache for frequently changing data
  short: {
    ttl: 1 * 60 * 1000, // 1 minute
    maxSize: 50
  },
  
  // Medium-term cache for semi-static data
  medium: {
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 100
  },
  
  // Long-term cache for static data
  long: {
    ttl: 30 * 60 * 1000, // 30 minutes
    maxSize: 200
  },
  
  // Statistics cache (can be slightly stale)
  stats: {
    ttl: 10 * 60 * 1000, // 10 minutes
    maxSize: 20,
    keyGenerator: (req) => `stats:${req.path}`
  }
};

/**
 * Cache management utilities
 */
export const cacheUtils = {
  // Get cache statistics
  getStats() {
    const entries = Array.from(cache.entries());
    const now = Date.now();
    
    return {
      size: cache.size,
      entries: entries.length,
      expired: entries.filter(([, value]) => now - value.timestamp > CACHE_TTL).length,
      memory: JSON.stringify(entries).length // Rough memory usage
    };
  },

  // Clear expired entries
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, value] of cache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        cache.delete(key);
        cleaned++;
      }
    }
    
    return cleaned;
  },

  // Clear all cache
  clear() {
    const size = cache.size;
    cache.clear();
    return size;
  },

  // Get cache hit rate
  getHitRate() {
    // This would need to be tracked separately in a real implementation
    return { hits: 0, misses: 0, rate: '0%' };
  }
};

/**
 * Automatic cache cleanup (run every 10 minutes)
 */
setInterval(() => {
  const cleaned = cacheUtils.cleanup();
  if (cleaned > 0) {
    console.log(`🧹 Cache cleanup: removed ${cleaned} expired entries`);
  }
}, 10 * 60 * 1000);

/**
 * HTTP cache headers middleware
 */
export function setCacheHeaders(maxAge = 300) {
  return (req, res, next) => {
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
      res.setHeader('ETag', `"${Date.now()}"`);
    }
    next();
  };
}

/**
 * No-cache headers for dynamic content
 */
export function setNoCacheHeaders(req, res, next) {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
}

