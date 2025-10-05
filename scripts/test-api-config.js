#!/usr/bin/env node

/**
 * Test script to verify the API configuration logic
 * This simulates different environments to test the configuration
 */

// Mock window object for testing
const mockWindow = (hostname) => ({
  location: { hostname },
  console: { log: console.log }
});

// Mock the configuration logic
function testApiConfig(hostname) {
  const window = mockWindow(hostname);
  
  // Check if we're running on localhost (actual local development)
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  
  // Check if we're in a deployed environment
  const isDeployed = hostname.includes('vercel.app') || 
                    hostname.includes('netlify.app') || 
                    hostname.includes('github.io') ||
                    hostname.includes('firebase.app') ||
                    hostname.includes('herokuapp.com') ||
                    hostname.includes('render.com') ||
                    (!isLocalhost && !hostname.includes('localhost') && !hostname.includes('127.0.0.1'));
  
  // Force production URL for any deployed environment
  if (isDeployed) {
    return 'https://cars-g-api.onrender.com';
  }
  
  // Only use localhost for actual local development
  if (isLocalhost) {
    return 'http://localhost:3001';
  }
  
  // Default to production for any other case
  return 'https://cars-g-api.onrender.com';
}

// Test cases
const testCases = [
  { hostname: 'localhost', expected: 'http://localhost:3001', description: 'Local development' },
  { hostname: '127.0.0.1', expected: 'http://localhost:3001', description: 'Local development (IP)' },
  { hostname: 'cars-g.vercel.app', expected: 'https://cars-g-api.onrender.com', description: 'Vercel production' },
  { hostname: 'cars-g-git-main-kevinmccarthy.vercel.app', expected: 'https://cars-g-api.onrender.com', description: 'Vercel preview' },
  { hostname: 'example.netlify.app', expected: 'https://cars-g-api.onrender.com', description: 'Netlify' },
  { hostname: 'example.github.io', expected: 'https://cars-g-api.onrender.com', description: 'GitHub Pages' },
  { hostname: 'example.firebase.app', expected: 'https://cars-g-api.onrender.com', description: 'Firebase Hosting' },
  { hostname: 'example.herokuapp.com', expected: 'https://cars-g-api.onrender.com', description: 'Heroku' },
  { hostname: 'example.render.com', expected: 'https://cars-g-api.onrender.com', description: 'Render' },
  { hostname: 'example.com', expected: 'https://cars-g-api.onrender.com', description: 'Custom domain' },
  { hostname: '192.168.1.100', expected: 'https://cars-g-api.onrender.com', description: 'Local network IP' }
];

console.log('🧪 Testing API Configuration Logic');
console.log('=' .repeat(50));

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const result = testApiConfig(testCase.hostname);
  const success = result === testCase.expected;
  
  console.log(`\nTest ${index + 1}: ${testCase.description}`);
  console.log(`  Hostname: ${testCase.hostname}`);
  console.log(`  Expected: ${testCase.expected}`);
  console.log(`  Actual:   ${result}`);
  console.log(`  Status:   ${success ? '✅ PASS' : '❌ FAIL'}`);
  
  if (success) {
    passed++;
  } else {
    failed++;
  }
});

console.log('\n' + '=' .repeat(50));
console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('🎉 All tests passed! The configuration logic is working correctly.');
} else {
  console.log('⚠️  Some tests failed. Please review the configuration logic.');
  process.exit(1);
}
