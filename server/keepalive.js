import https from 'https';
import http from 'http';

class KeepAlive {
  constructor(options = {}) {
    this.url = options.url || process.env.RENDER_EXTERNAL_URL || 'https://cars-g-api.onrender.com';
    this.interval = options.interval || 14 * 60 * 1000; // 14 minutes (Render free tier sleeps after 15 minutes)
    this.timeout = options.timeout || 30000; // 30 seconds
    this.enabled = options.enabled !== false && process.env.NODE_ENV === 'production';
    this.intervalId = null;
    this.isRunning = false;
    
    console.log(`KeepAlive initialized: ${this.enabled ? 'enabled' : 'disabled'}`);
    console.log(`URL: ${this.url}`);
    console.log(`Interval: ${this.interval / 1000}s`);
  }

  start() {
    if (!this.enabled || this.isRunning) return;
    
    this.isRunning = true;
    console.log('Starting KeepAlive service...');
    
    // Initial ping after 5 minutes
    setTimeout(() => this.ping(), 5 * 60 * 1000);
    
    // Regular pings
    this.intervalId = setInterval(() => this.ping(), this.interval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('KeepAlive service stopped');
  }

  ping() {
    if (!this.enabled) return;
    
    const startTime = Date.now();
    const url = new URL(this.url + '/health');
    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'GET',
      timeout: this.timeout,
      headers: {
        'User-Agent': 'KeepAlive/1.0',
        'Accept': 'application/json'
      }
    }, (res) => {
      const duration = Date.now() - startTime;
      console.log(`KeepAlive ping: ${res.statusCode} (${duration}ms)`);
      
      // Consume response to free up memory
      res.resume();
    });

    req.on('error', (error) => {
      const duration = Date.now() - startTime;
      console.error(`KeepAlive ping failed (${duration}ms):`, error.message);
    });

    req.on('timeout', () => {
      req.destroy();
      console.error(`KeepAlive ping timeout after ${this.timeout}ms`);
    });

    req.end();
  }

  // Health check for the keep-alive service itself
  getStatus() {
    return {
      enabled: this.enabled,
      running: this.isRunning,
      url: this.url,
      interval: this.interval,
      timeout: this.timeout,
      nextPing: this.intervalId ? new Date(Date.now() + this.interval).toISOString() : null
    };
  }
}

// Singleton instance
let keepAliveInstance = null;

function createKeepAlive(options) {
  if (!keepAliveInstance) {
    keepAliveInstance = new KeepAlive(options);
  }
  return keepAliveInstance;
}

function getKeepAlive() {
  return keepAliveInstance;
}

export {
  KeepAlive,
  createKeepAlive,
  getKeepAlive
};
