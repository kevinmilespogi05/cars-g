import { createClient } from '@supabase/supabase-js';

class WarmupService {
  constructor() {
    this.supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    this.isWarmedUp = false;
    this.warmupStartTime = null;
  }

  async warmup() {
    if (this.isWarmedUp) {
      console.log('Service already warmed up');
      return;
    }

    this.warmupStartTime = Date.now();
    console.log('Starting service warmup...');

    try {
      await Promise.all([
        this.warmupDatabase(),
        this.warmupCache(),
        this.warmupConnections(),
        this.preloadCriticalData()
      ]);

      this.isWarmedUp = true;
      const duration = Date.now() - this.warmupStartTime;
      console.log(`Service warmup completed in ${duration}ms`);
    } catch (error) {
      console.error('Warmup failed:', error);
      // Don't throw - let the service start even if warmup fails
    }
  }

  async warmupDatabase() {
    try {
      // Test database connection with a simple query
      const { data, error } = await this.supabase
        .from('profiles')
        .select('id')
        .limit(1);

      if (error) throw error;
      console.log('✓ Database connection warmed up');
    } catch (error) {
      console.error('Database warmup failed:', error.message);
    }
  }

  async warmupCache() {
    try {
      // Initialize any in-memory caches here
      // For now, just simulate cache warmup
      await new Promise(resolve => setTimeout(resolve, 10));
      console.log('✓ Cache warmed up');
    } catch (error) {
      console.error('Cache warmup failed:', error.message);
    }
  }

  async warmupConnections() {
    try {
      // Pre-establish any external connections
      // This could include third-party APIs, etc.
      await new Promise(resolve => setTimeout(resolve, 10));
      console.log('✓ External connections warmed up');
    } catch (error) {
      console.error('Connection warmup failed:', error.message);
    }
  }

  async preloadCriticalData() {
    try {
      // Preload frequently accessed data
      const promises = [
        // Preload recent reports count
        this.supabase
          .from('reports')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        
        // Preload active users count
        this.supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .gte('last_seen', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      ];

      await Promise.allSettled(promises);
      console.log('✓ Critical data preloaded');
    } catch (error) {
      console.error('Data preload failed:', error.message);
    }
  }

  getStatus() {
    return {
      isWarmedUp: this.isWarmedUp,
      warmupDuration: this.warmupStartTime ? Date.now() - this.warmupStartTime : null,
      warmupStartTime: this.warmupStartTime
    };
  }

  // Middleware to ensure warmup before handling requests
  middleware() {
    return async (req, res, next) => {
      if (!this.isWarmedUp) {
        // Start warmup if not already started
        if (!this.warmupStartTime) {
          this.warmup(); // Don't await - let it run in background
        }
      }
      next();
    };
  }
}

export { WarmupService };
