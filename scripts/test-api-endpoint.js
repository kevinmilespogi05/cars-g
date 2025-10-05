#!/usr/bin/env node

/**
 * Test script to verify API endpoint accessibility
 * Usage: node scripts/test-api-endpoint.js [url]
 */

import https from 'https';
import http from 'http';

const testUrl = process.argv[2] || 'https://cars-g-api.onrender.com/api/performance';

console.log(`🔍 Testing API endpoint: ${testUrl}`);
console.log('=' .repeat(50));

function testEndpoint(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    
    const startTime = Date.now();
    
    const req = client.get(url, (res) => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            responseTime,
            data: jsonData,
            headers: res.headers
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            responseTime,
            data: data,
            error: 'Failed to parse JSON',
            headers: res.headers
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject({
        error: error.message,
        code: error.code
      });
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject({
        error: 'Request timeout',
        code: 'TIMEOUT'
      });
    });
  });
}

async function runTest() {
  try {
    const result = await testEndpoint(testUrl);
    
    console.log(`✅ Status: ${result.status}`);
    console.log(`⏱️  Response Time: ${result.responseTime}ms`);
    console.log(`📊 Data:`, JSON.stringify(result.data, null, 2));
    
    if (result.status === 200) {
      console.log('\n🎉 API endpoint is working correctly!');
      
      if (result.data && typeof result.data === 'object') {
        console.log('\n📈 Performance Metrics:');
        if (result.data.uptime) {
          const hours = Math.floor(result.data.uptime / 3600);
          const minutes = Math.floor((result.data.uptime % 3600) / 60);
          const seconds = result.data.uptime % 60;
          console.log(`   Uptime: ${hours}h ${minutes}m ${seconds}s`);
        }
        if (result.data.connectionsActive !== undefined) {
          console.log(`   Active Connections: ${result.data.connectionsActive}`);
        }
        if (result.data.averageResponseTime !== undefined) {
          console.log(`   Average Response Time: ${result.data.averageResponseTime}ms`);
        }
        if (result.data.messagesProcessed !== undefined) {
          console.log(`   Messages Processed: ${result.data.messagesProcessed}`);
        }
        if (result.data.messagesPerSecond !== undefined) {
          console.log(`   Messages/Second: ${result.data.messagesPerSecond}`);
        }
      }
    } else {
      console.log(`\n⚠️  API responded with status ${result.status}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }
    
  } catch (error) {
    console.log(`❌ Failed to connect to API endpoint`);
    console.log(`   Error: ${error.error || error.message}`);
    console.log(`   Code: ${error.code || 'UNKNOWN'}`);
    
    console.log('\n🔧 Troubleshooting suggestions:');
    console.log('   1. Check if the backend server is running');
    console.log('   2. Verify the URL is correct');
    console.log('   3. Check network connectivity');
    console.log('   4. Verify CORS settings on the backend');
    
    process.exit(1);
  }
}

runTest();
