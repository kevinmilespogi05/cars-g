/**
 * Minimal Health Check Routes
 * 
 * Ultra-lightweight health checks that load instantly
 * Perfect for UptimeRobot monitoring
 */

// No external dependencies - pure Node.js
export function healthCheck(req, res) {
  const uptime = Math.floor(process.uptime());
  const memory = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  
  res.status(200).json({
    status: 'OK', // UptimeRobot keyword
    timestamp: new Date().toISOString(),
    uptime: `${uptime}s`,
    memory: `${memory}MB`,
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
}

// Even more minimal ping endpoint
export function ping(req, res) {
  res.status(200).json({ 
    status: 'OK',
    timestamp: Date.now()
  });
}

// Lightweight readiness check
export function ready(req, res) {
  // Check if essential services are available
  const checks = {
    server: true,
    environment: !!process.env.VITE_SUPABASE_URL,
    memory: process.memoryUsage().heapUsed < 100 * 1024 * 1024 // Under 100MB
  };
  
  const allReady = Object.values(checks).every(Boolean);
  
  res.status(allReady ? 200 : 503).json({
    status: allReady ? 'ready' : 'not_ready',
    checks,
    timestamp: new Date().toISOString()
  });
}

// Startup time tracking
const startupTime = Date.now();

export function startup(req, res) {
  const uptime = Date.now() - startupTime;
  
  res.json({
    startup_time: `${uptime}ms`,
    status: 'started',
    timestamp: new Date().toISOString()
  });
}

