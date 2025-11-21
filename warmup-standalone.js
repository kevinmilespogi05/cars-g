#!/usr/bin/env node
/**
 * Standalone Warmup Script for BANTAY SP
 * Can be run externally via cron jobs, GitHub Actions, or other services
 * to prevent cold starts on serverless deployments
 */

import fetch from 'node-fetch';
import { setTimeout } from 'timers/promises';

const CONFIG = {
  // Production URLs
  backend: 'https://cars-g-api.onrender.com',
  frontend: 'https://cars-g.vercel.app',
  
  // Request timeout
  timeout: 30000, // 30 seconds
  
  // Retry configuration
  maxRetries: 3,
  retryDelay: 2000, // 2 seconds
};

class StandaloneWarmup {
  constructor() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      startTime: Date.now()
    };
  }

  async makeRequest(url, options = {}, retryCount = 0) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);

    try {
      console.log(`🌐 Making request to: ${url}`);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': 'BANTAY-SP-Standalone-Warmup/1.0',
          'Accept': 'application/json',
          ...options.headers
        }
      });

      clearTimeout(timeoutId);
      this.stats.totalRequests++;

      if (response.ok) {
        this.stats.successfulRequests++;
        console.log(`✅ Success: ${url} (${response.status})`);
        return { success: true, status: response.status, url };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      clearTimeout(timeoutId);
      this.stats.totalRequests++;
      this.stats.failedRequests++;

      console.warn(`❌ Failed: ${url} - ${error.message}`);

      // Retry logic
      if (retryCount < CONFIG.maxRetries) {
        console.log(`🔄 Retrying in ${CONFIG.retryDelay}ms... (${retryCount + 1}/${CONFIG.maxRetries})`);
        await setTimeout(CONFIG.retryDelay);
        return this.makeRequest(url, options, retryCount + 1);
      }

      return { success: false, error: error.message, url };
    }
  }

  async warmupBackend() {
    console.log('\n🔥 Warming up backend services...');
    
    const endpoints = [
      { url: `${CONFIG.backend}/health`, name: 'Health Check' }
      // Email test endpoint removed to prevent email flooding
    ];

    const results = [];
    for (const endpoint of endpoints) {
      console.log(`\n🎯 Testing: ${endpoint.name}`);
      const result = await this.makeRequest(endpoint.url, endpoint.options);
      results.push({ ...result, name: endpoint.name });
      
      // Small delay between requests
      await setTimeout(1000);
    }

    return results;
  }

  async warmupFrontend() {
    console.log('\n🌐 Warming up frontend...');
    
    const result = await this.makeRequest(CONFIG.frontend);
    return [{ ...result, name: 'Frontend' }];
  }

  async run() {
    console.log('🚀 BANTAY SP Standalone Warmup Service');
    console.log('===================================');
    console.log(`📅 Started at: ${new Date().toISOString()}`);
    console.log(`🎯 Backend: ${CONFIG.backend}`);
    console.log(`🌐 Frontend: ${CONFIG.frontend}`);

    try {
      // Warm up backend services
      const backendResults = await this.warmupBackend();
      
      // Small delay before frontend
      await setTimeout(2000);
      
      // Warm up frontend
      const frontendResults = await this.warmupFrontend();

      // Combine results
      const allResults = [...backendResults, ...frontendResults];
      
      // Generate report
      this.generateReport(allResults);

      // Exit with appropriate code
      const hasFailures = allResults.some(r => !r.success);
      process.exit(hasFailures ? 1 : 0);

    } catch (error) {
      console.error('\n❌ Warmup process failed:', error.message);
      process.exit(1);
    }
  }

  generateReport(results) {
    const duration = Math.round((Date.now() - this.stats.startTime) / 1000);
    
    console.log('\n📊 Warmup Results:');
    console.log('==================');
    
    results.forEach(result => {
      const status = result.success ? '✅ SUCCESS' : '❌ FAILED';
      const details = result.success 
        ? `(${result.status})` 
        : `(${result.error})`;
      console.log(`${status} ${result.name} ${details}`);
    });
    
    console.log('\n📈 Statistics:');
    console.log(`   Duration: ${duration}s`);
    console.log(`   Total Requests: ${this.stats.totalRequests}`);
    console.log(`   Successful: ${this.stats.successfulRequests}`);
    console.log(`   Failed: ${this.stats.failedRequests}`);
    console.log(`   Success Rate: ${((this.stats.successfulRequests / this.stats.totalRequests) * 100).toFixed(1)}%`);
    
    const allSuccess = this.stats.failedRequests === 0;
    console.log(`\n🎉 Overall Status: ${allSuccess ? 'ALL SYSTEMS WARM' : 'SOME FAILURES DETECTED'}`);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const isVerbose = args.includes('--verbose') || args.includes('-v');
const isQuiet = args.includes('--quiet') || args.includes('-q');

if (isQuiet) {
  // Suppress most output in quiet mode
  const originalLog = console.log;
  console.log = (...args) => {
    if (args[0] && (args[0].includes('✅') || args[0].includes('❌') || args[0].includes('📊'))) {
      originalLog(...args);
    }
  };
}

// Show help
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🔥 BANTAY SP Standalone Warmup Service

Usage: node warmup-standalone.js [options]

Options:
  -v, --verbose    Show detailed output
  -q, --quiet      Show minimal output
  -h, --help       Show this help message

Environment Variables:
  CARS_G_BACKEND_URL    Override backend URL (default: ${CONFIG.backend})
  CARS_G_FRONTEND_URL   Override frontend URL (default: ${CONFIG.frontend})

Examples:
  node warmup-standalone.js              # Standard warmup
  node warmup-standalone.js --verbose    # Detailed output
  node warmup-standalone.js --quiet      # Minimal output
  
  # Custom URLs
  CARS_G_BACKEND_URL=https://my-api.com node warmup-standalone.js
`);
  process.exit(0);
}

// Override URLs from environment if provided
if (process.env.CARS_G_BACKEND_URL) {
  CONFIG.backend = process.env.CARS_G_BACKEND_URL;
}

if (process.env.CARS_G_FRONTEND_URL) {
  CONFIG.frontend = process.env.CARS_G_FRONTEND_URL;
}

// Run the warmup service
const warmup = new StandaloneWarmup();
warmup.run().catch(error => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});