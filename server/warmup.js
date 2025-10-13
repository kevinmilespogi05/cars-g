/**
 * Warm-up Service for CARS-G Server
 * Prevents cold starts by keeping the server active with periodic requests
 */

import fetch from 'node-fetch';

const WARMUP_CONFIG = {
  // Intervals in milliseconds
  intervals: {
    critical: 4 * 60 * 1000,      // 4 minutes for critical endpoints
    standard: 6 * 60 * 1000,      // 6 minutes for standard endpoints
    database: 10 * 60 * 1000,     // 10 minutes for database health
  },
  
  // Endpoints to keep warm
  endpoints: {
    production: {
      base: 'https://cars-g-api.onrender.com',
      frontend: 'https://cars-g.vercel.app'
    },
    development: {
      base: 'http://localhost:3001',
      frontend: 'http://localhost:5173'
    }
  },
  
  // Timeout for requests
  timeout: 15000, // 15 seconds
};

class WarmupService {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.baseUrl = this.isProduction 
      ? WARMUP_CONFIG.endpoints.production.base 
      : WARMUP_CONFIG.endpoints.development.base;
    this.frontendUrl = this.isProduction 
      ? WARMUP_CONFIG.endpoints.production.frontend 
      : WARMUP_CONFIG.endpoints.development.frontend;
    
    this.timers = [];
    this.stats = {
      requests: 0,
      failures: 0,
      lastSuccess: null,
      lastFailure: null,
      uptime: Date.now()
    };

    console.log(`🔥 Warmup Service initialized for ${this.isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
    console.log(`📡 Backend: ${this.baseUrl}`);
    console.log(`🌐 Frontend: ${this.frontendUrl}`);
  }

  async makeRequest(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WARMUP_CONFIG.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': 'CARS-G-Warmup-Service/1.0',
          'Accept': 'application/json',
          ...options.headers
        }
      });

      clearTimeout(timeoutId);
      this.stats.requests++;
      this.stats.lastSuccess = new Date().toISOString();

      return {
        success: true,
        status: response.status,
        url: url
      };
    } catch (error) {
      clearTimeout(timeoutId);
      this.stats.failures++;
      this.stats.lastFailure = new Date().toISOString();
      
      console.warn(`🚨 Warmup request failed: ${url}`, error.message);
      return {
        success: false,
        error: error.message,
        url: url
      };
    }
  }

  async warmupHealth() {
    console.log('🏥 Health check warmup...');
    const result = await this.makeRequest(`${this.baseUrl}/health`);
    
    if (result.success) {
      console.log('✅ Health check successful');
    }
    
    return result;
  }

  async warmupAuth() {
    console.log('🔐 Auth endpoints warmup...');
    
    // Warm up the email test endpoint (doesn't send actual emails)
    const emailResult = await this.makeRequest(`${this.baseUrl}/api/email/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: 'warmup@example.com',
        subject: 'Warmup Test',
        text: 'This is a warmup request'
      })
    });

    if (emailResult.success) {
      console.log('✅ Auth endpoints warmed up');
    }

    return emailResult;
  }

  async warmupDatabase() {
    console.log('🗄️ Database warmup...');
    
    // Make a light database query to keep connections active
    const result = await this.makeRequest(`${this.baseUrl}/api/stats/overview`);
    
    if (result.success) {
      console.log('✅ Database connection active');
    }
    
    return result;
  }

  async warmupFrontend() {
    if (!this.isProduction) {
      // Skip frontend warmup in development
      return { success: true, skipped: true };
    }

    console.log('🌐 Frontend warmup...');
    const result = await this.makeRequest(this.frontendUrl);
    
    if (result.success) {
      console.log('✅ Frontend warmed up');
    }
    
    return result;
  }

  startCriticalWarmup() {
    const timer = setInterval(async () => {
      console.log(`\n🔥 Critical warmup cycle - ${new Date().toLocaleTimeString()}`);
      await Promise.all([
        this.warmupHealth(),
        this.warmupAuth()
      ]);
    }, WARMUP_CONFIG.intervals.critical);

    this.timers.push(timer);
    console.log(`⏰ Critical warmup scheduled every ${WARMUP_CONFIG.intervals.critical / 60000} minutes`);
  }

  startStandardWarmup() {
    const timer = setInterval(async () => {
      console.log(`\n🔄 Standard warmup cycle - ${new Date().toLocaleTimeString()}`);
      await this.warmupFrontend();
    }, WARMUP_CONFIG.intervals.standard);

    this.timers.push(timer);
    console.log(`⏰ Standard warmup scheduled every ${WARMUP_CONFIG.intervals.standard / 60000} minutes`);
  }

  startDatabaseWarmup() {
    const timer = setInterval(async () => {
      console.log(`\n🗄️ Database warmup cycle - ${new Date().toLocaleTimeString()}`);
      await this.warmupDatabase();
    }, WARMUP_CONFIG.intervals.database);

    this.timers.push(timer);
    console.log(`⏰ Database warmup scheduled every ${WARMUP_CONFIG.intervals.database / 60000} minutes`);
  }

  start() {
    console.log('\n🚀 Starting CARS-G Warmup Service...');
    
    // Initial warmup
    setTimeout(async () => {
      console.log('🔥 Initial warmup...');
      await Promise.all([
        this.warmupHealth(),
        this.warmupAuth(),
        this.warmupDatabase(),
        this.warmupFrontend()
      ]);
      console.log('✅ Initial warmup completed\n');
    }, 30000); // Wait 30 seconds for server to be fully ready

    // Start periodic warmups
    this.startCriticalWarmup();
    this.startStandardWarmup();
    this.startDatabaseWarmup();

    // Stats logging every 30 minutes
    const statsTimer = setInterval(() => {
      this.logStats();
    }, 30 * 60 * 1000);

    this.timers.push(statsTimer);

    console.log('🔥 Warmup service is now active!');
  }

  stop() {
    console.log('🛑 Stopping warmup service...');
    this.timers.forEach(timer => clearInterval(timer));
    this.timers = [];
    console.log('✅ Warmup service stopped');
  }

  logStats() {
    const uptime = Math.floor((Date.now() - this.stats.uptime) / 1000 / 60); // minutes
    const successRate = this.stats.requests > 0 
      ? ((this.stats.requests - this.stats.failures) / this.stats.requests * 100).toFixed(1)
      : 0;

    console.log('\n📊 Warmup Service Stats:');
    console.log(`   Uptime: ${uptime} minutes`);
    console.log(`   Total Requests: ${this.stats.requests}`);
    console.log(`   Failed Requests: ${this.stats.failures}`);
    console.log(`   Success Rate: ${successRate}%`);
    console.log(`   Last Success: ${this.stats.lastSuccess || 'None'}`);
    console.log(`   Last Failure: ${this.stats.lastFailure || 'None'}`);
  }

  // Graceful shutdown
  setupGracefulShutdown() {
    const cleanup = () => {
      console.log('\n🔄 Graceful shutdown initiated...');
      this.stop();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('SIGQUIT', cleanup);
  }
}

// Export for use in other modules
export default WarmupService;

// If run directly, start the warmup service
if (import.meta.url === `file://${process.argv[1]}`) {
  const warmupService = new WarmupService();
  warmupService.setupGracefulShutdown();
  warmupService.start();
}