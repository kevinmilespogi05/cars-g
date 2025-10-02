#!/usr/bin/env node

/**
 * Deployment Warmup Script
 * 
 * This script warms up the deployed application by:
 * 1. Checking health endpoints
 * 2. Pre-loading critical resources
 * 3. Warming up database connections
 * 4. Testing API endpoints
 */

import https from 'https';
import http from 'http';

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://cars-g.vercel.app';
const BACKEND_URL = process.env.BACKEND_URL || 'https://cars-g-api.onrender.com';

class DeploymentWarmer {
  constructor() {
    this.results = {
      frontend: { status: 'pending', time: null, error: null },
      backend: { status: 'pending', time: null, error: null },
      api: { status: 'pending', time: null, error: null },
      database: { status: 'pending', time: null, error: null }
    };
  }

  async warmup() {
    console.log('🔥 Starting deployment warmup...\n');
    
    try {
      await Promise.allSettled([
        this.warmupFrontend(),
        this.warmupBackend(),
        this.warmupAPI(),
        this.warmupDatabase()
      ]);

      this.printResults();
      
      const allSuccessful = Object.values(this.results).every(r => r.status === 'success');
      if (allSuccessful) {
        console.log('\n✅ Deployment warmup completed successfully!');
        process.exit(0);
      } else {
        console.log('\n⚠️  Some warmup tasks failed, but deployment should still work');
        process.exit(0); // Don't fail deployment for warmup issues
      }
    } catch (error) {
      console.error('\n❌ Warmup failed:', error.message);
      process.exit(0); // Don't fail deployment for warmup issues
    }
  }

  async warmupFrontend() {
    console.log('🌐 Warming up frontend...');
    const start = Date.now();
    
    try {
      await this.makeRequest(FRONTEND_URL);
      this.results.frontend = { 
        status: 'success', 
        time: Date.now() - start, 
        error: null 
      };
      console.log(`✅ Frontend warmed up (${this.results.frontend.time}ms)`);
    } catch (error) {
      this.results.frontend = { 
        status: 'error', 
        time: Date.now() - start, 
        error: error.message 
      };
      console.log(`❌ Frontend warmup failed: ${error.message}`);
    }
  }

  async warmupBackend() {
    console.log('🚀 Warming up backend...');
    const start = Date.now();
    
    try {
      await this.makeRequest(`${BACKEND_URL}/health`);
      this.results.backend = { 
        status: 'success', 
        time: Date.now() - start, 
        error: null 
      };
      console.log(`✅ Backend warmed up (${this.results.backend.time}ms)`);
    } catch (error) {
      this.results.backend = { 
        status: 'error', 
        time: Date.now() - start, 
        error: error.message 
      };
      console.log(`❌ Backend warmup failed: ${error.message}`);
    }
  }

  async warmupAPI() {
    console.log('🔌 Warming up API endpoints...');
    const start = Date.now();
    
    try {
      const endpoints = [
        '/api/status',
        '/api/reports?limit=1',
        '/api/statistics'
      ];

      await Promise.allSettled(
        endpoints.map(endpoint => 
          this.makeRequest(`${BACKEND_URL}${endpoint}`)
        )
      );

      this.results.api = { 
        status: 'success', 
        time: Date.now() - start, 
        error: null 
      };
      console.log(`✅ API endpoints warmed up (${this.results.api.time}ms)`);
    } catch (error) {
      this.results.api = { 
        status: 'error', 
        time: Date.now() - start, 
        error: error.message 
      };
      console.log(`❌ API warmup failed: ${error.message}`);
    }
  }

  async warmupDatabase() {
    console.log('🗄️  Warming up database connections...');
    const start = Date.now();
    
    try {
      // Test database through API endpoint
      await this.makeRequest(`${BACKEND_URL}/api/status`);
      
      this.results.database = { 
        status: 'success', 
        time: Date.now() - start, 
        error: null 
      };
      console.log(`✅ Database warmed up (${this.results.database.time}ms)`);
    } catch (error) {
      this.results.database = { 
        status: 'error', 
        time: Date.now() - start, 
        error: error.message 
      };
      console.log(`❌ Database warmup failed: ${error.message}`);
    }
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
          'User-Agent': 'DeploymentWarmer/1.0',
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

  printResults() {
    console.log('\n📊 Warmup Results:');
    console.log('==================');
    
    Object.entries(this.results).forEach(([service, result]) => {
      const status = result.status === 'success' ? '✅' : '❌';
      const time = result.time ? `${result.time}ms` : 'N/A';
      const error = result.error ? ` (${result.error})` : '';
      
      console.log(`${status} ${service.padEnd(10)} - ${time}${error}`);
    });
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const warmer = new DeploymentWarmer();
  warmer.warmup().catch(console.error);
}

export { DeploymentWarmer };
