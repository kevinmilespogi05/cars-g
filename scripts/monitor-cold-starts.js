#!/usr/bin/env node

/**
 * Cold Start Monitor
 * 
 * Monitors application performance and detects potential cold start issues.
 * Can be run as a cron job or continuous monitoring service.
 */

import https from 'https';
import http from 'http';
import fs from 'fs/promises';
import path from 'path';

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://cars-g.vercel.app';
const BACKEND_URL = process.env.BACKEND_URL || 'https://cars-g-api.onrender.com';
const COLD_START_THRESHOLD = 5000; // 5 seconds
const SLOW_RESPONSE_THRESHOLD = 2000; // 2 seconds
const MONITOR_INTERVAL = 5 * 60 * 1000; // 5 minutes
const LOG_FILE = 'cold-start-monitor.log';

class ColdStartMonitor {
  constructor() {
    this.metrics = {
      checks: 0,
      coldStarts: 0,
      slowResponses: 0,
      errors: 0,
      averageResponseTime: 0,
      lastCheck: null,
      history: []
    };
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) {
      console.log('Monitor is already running');
      return;
    }

    this.isRunning = true;
    console.log('🔍 Starting Cold Start Monitor...');
    console.log(`📊 Thresholds: Cold Start: ${COLD_START_THRESHOLD}ms, Slow: ${SLOW_RESPONSE_THRESHOLD}ms`);
    console.log(`⏰ Interval: ${MONITOR_INTERVAL / 1000}s\n`);

    // Initial check
    await this.performCheck();

    // Set up interval
    this.intervalId = setInterval(() => {
      this.performCheck().catch(console.error);
    }, MONITOR_INTERVAL);

    // Graceful shutdown
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }

  async stop() {
    if (!this.isRunning) return;

    console.log('\n🛑 Stopping Cold Start Monitor...');
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    await this.saveMetrics();
    console.log('📊 Final metrics saved');
    process.exit(0);
  }

  async performCheck() {
    const checkId = Date.now();
    console.log(`🔍 Performing check #${this.metrics.checks + 1} at ${new Date().toISOString()}`);

    try {
      const results = await Promise.allSettled([
        this.checkEndpoint('Frontend', FRONTEND_URL),
        this.checkEndpoint('Backend Health', `${BACKEND_URL}/health`),
        this.checkEndpoint('Backend API', `${BACKEND_URL}/api/status`),
        this.checkEndpoint('Reports API', `${BACKEND_URL}/api/reports?limit=1`)
      ]);

      const metrics = this.analyzeResults(results);
      await this.recordMetrics(checkId, metrics);
      
      this.metrics.checks++;
      this.metrics.lastCheck = new Date().toISOString();

      // Check for cold starts and alerts
      if (metrics.maxResponseTime > COLD_START_THRESHOLD) {
        this.metrics.coldStarts++;
        await this.alertColdStart(metrics);
      } else if (metrics.maxResponseTime > SLOW_RESPONSE_THRESHOLD) {
        this.metrics.slowResponses++;
        await this.alertSlowResponse(metrics);
      }

      console.log(`✅ Check completed - Max: ${metrics.maxResponseTime}ms, Avg: ${metrics.avgResponseTime}ms\n`);

    } catch (error) {
      this.metrics.errors++;
      console.error('❌ Check failed:', error.message);
      await this.logError(checkId, error);
    }
  }

  async checkEndpoint(name, url) {
    const start = Date.now();
    
    try {
      await this.makeRequest(url);
      const responseTime = Date.now() - start;
      
      return {
        name,
        url,
        success: true,
        responseTime,
        error: null
      };
    } catch (error) {
      return {
        name,
        url,
        success: false,
        responseTime: Date.now() - start,
        error: error.message
      };
    }
  }

  analyzeResults(results) {
    const successful = results
      .filter(r => r.status === 'fulfilled' && r.value.success)
      .map(r => r.value);

    const responseTimes = successful.map(r => r.responseTime);
    
    return {
      totalChecks: results.length,
      successfulChecks: successful.length,
      maxResponseTime: Math.max(...responseTimes, 0),
      minResponseTime: Math.min(...responseTimes, 0),
      avgResponseTime: Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) || 0,
      results: results.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason.message })
    };
  }

  async recordMetrics(checkId, metrics) {
    // Update running averages
    const totalChecks = this.metrics.checks + 1;
    this.metrics.averageResponseTime = Math.round(
      (this.metrics.averageResponseTime * this.metrics.checks + metrics.avgResponseTime) / totalChecks
    );

    // Store in history (keep last 100 checks)
    this.metrics.history.push({
      checkId,
      timestamp: new Date().toISOString(),
      ...metrics
    });

    if (this.metrics.history.length > 100) {
      this.metrics.history.shift();
    }

    // Save to file periodically
    if (this.metrics.checks % 10 === 0) {
      await this.saveMetrics();
    }
  }

  async alertColdStart(metrics) {
    const message = `🚨 COLD START DETECTED!\n` +
      `Max Response Time: ${metrics.maxResponseTime}ms\n` +
      `Average: ${metrics.avgResponseTime}ms\n` +
      `Time: ${new Date().toISOString()}\n` +
      `Threshold: ${COLD_START_THRESHOLD}ms`;

    console.log('\n' + message + '\n');
    await this.logAlert('COLD_START', message);

    // Here you could integrate with external alerting systems:
    // - Send email
    // - Slack webhook
    // - Discord webhook
    // - PagerDuty
    // - etc.
  }

  async alertSlowResponse(metrics) {
    const message = `⚠️  Slow response detected: ${metrics.maxResponseTime}ms (threshold: ${SLOW_RESPONSE_THRESHOLD}ms)`;
    console.log(message);
    await this.logAlert('SLOW_RESPONSE', message);
  }

  async logAlert(type, message) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type,
      message,
      metrics: this.getPublicMetrics()
    };

    try {
      const logLine = JSON.stringify(logEntry) + '\n';
      await fs.appendFile(LOG_FILE, logLine);
    } catch (error) {
      console.error('Failed to write alert log:', error.message);
    }
  }

  async logError(checkId, error) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'ERROR',
      checkId,
      error: error.message,
      stack: error.stack
    };

    try {
      const logLine = JSON.stringify(logEntry) + '\n';
      await fs.appendFile(LOG_FILE, logLine);
    } catch (writeError) {
      console.error('Failed to write error log:', writeError.message);
    }
  }

  async saveMetrics() {
    try {
      const metricsFile = 'cold-start-metrics.json';
      await fs.writeFile(metricsFile, JSON.stringify(this.metrics, null, 2));
    } catch (error) {
      console.error('Failed to save metrics:', error.message);
    }
  }

  getPublicMetrics() {
    return {
      checks: this.metrics.checks,
      coldStarts: this.metrics.coldStarts,
      slowResponses: this.metrics.slowResponses,
      errors: this.metrics.errors,
      averageResponseTime: this.metrics.averageResponseTime,
      lastCheck: this.metrics.lastCheck,
      coldStartRate: this.metrics.checks > 0 ? (this.metrics.coldStarts / this.metrics.checks * 100).toFixed(2) + '%' : '0%',
      errorRate: this.metrics.checks > 0 ? (this.metrics.errors / this.metrics.checks * 100).toFixed(2) + '%' : '0%'
    };
  }

  makeRequest(url, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const req = client.request({
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        timeout: timeout,
        headers: {
          'User-Agent': 'ColdStartMonitor/1.0',
          'Accept': 'text/html,application/json,*/*'
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 400) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timeout after ${timeout}ms`));
      });

      req.end();
    });
  }

  // CLI command to show current status
  async showStatus() {
    try {
      const metricsFile = 'cold-start-metrics.json';
      const data = await fs.readFile(metricsFile, 'utf8');
      const metrics = JSON.parse(data);
      
      console.log('📊 Cold Start Monitor Status');
      console.log('============================');
      console.log(`Total Checks: ${metrics.checks}`);
      console.log(`Cold Starts: ${metrics.coldStarts} (${metrics.checks > 0 ? (metrics.coldStarts / metrics.checks * 100).toFixed(2) : 0}%)`);
      console.log(`Slow Responses: ${metrics.slowResponses}`);
      console.log(`Errors: ${metrics.errors} (${metrics.checks > 0 ? (metrics.errors / metrics.checks * 100).toFixed(2) : 0}%)`);
      console.log(`Average Response Time: ${metrics.averageResponseTime}ms`);
      console.log(`Last Check: ${metrics.lastCheck || 'Never'}`);
      
      if (metrics.history && metrics.history.length > 0) {
        const recent = metrics.history.slice(-5);
        console.log('\n📈 Recent Checks:');
        recent.forEach(check => {
          console.log(`  ${check.timestamp}: ${check.maxResponseTime}ms (avg: ${check.avgResponseTime}ms)`);
        });
      }
    } catch (error) {
      console.log('No monitoring data available yet. Run monitor first.');
    }
  }
}

// CLI handling
const command = process.argv[2];
const monitor = new ColdStartMonitor();

switch (command) {
  case 'start':
    monitor.start();
    break;
  case 'status':
    monitor.showStatus();
    break;
  case 'once':
    monitor.performCheck().then(() => process.exit(0));
    break;
  default:
    console.log('Usage: node monitor-cold-starts.js [start|status|once]');
    console.log('  start  - Start continuous monitoring');
    console.log('  status - Show current metrics');
    console.log('  once   - Perform single check');
    process.exit(1);
}

export { ColdStartMonitor };
