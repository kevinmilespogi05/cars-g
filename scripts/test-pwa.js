#!/usr/bin/env node

/**
 * PWA Testing Script
 * Tests various PWA features and provides recommendations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Cars-G PWA Testing Script\n');

// Test 1: Check manifest file
console.log('1. Checking Web App Manifest...');
try {
  const manifestPath = path.join(__dirname, '..', 'public', 'manifest.webmanifest');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
  const missingFields = requiredFields.filter(field => !manifest[field]);
  
  if (missingFields.length === 0) {
    console.log('✅ Manifest file is valid');
  } else {
    console.log('❌ Manifest missing required fields:', missingFields);
  }
  
  // Check icons
  if (manifest.icons && manifest.icons.length > 0) {
    const hasMaskable = manifest.icons.some(icon => icon.purpose && icon.purpose.includes('maskable'));
    const hasAny = manifest.icons.some(icon => icon.purpose && icon.purpose.includes('any'));
    
    if (hasMaskable && hasAny) {
      console.log('✅ Icons include both "any" and "maskable" purposes');
    } else {
      console.log('⚠️  Icons should include both "any" and "maskable" purposes');
    }
  }
  
} catch (error) {
  console.log('❌ Error reading manifest:', error.message);
}

// Test 2: Check service worker files
console.log('\n2. Checking Service Worker Files...');
const swFiles = [
  'public/firebase-messaging-sw.js',
  'public/clear-sw.js',
  'public/offline.html'
];

swFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
  }
});

// Test 3: Check PWA icons
console.log('\n3. Checking PWA Icons...');
const iconFiles = [
  'public/pwa-192x192.png',
  'public/pwa-512x512.png',
  'public/apple-touch-icon.png',
  'public/favicon-16x16.png',
  'public/favicon-32x32.png'
];

iconFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`✅ ${file} exists (${Math.round(stats.size / 1024)}KB)`);
  } else {
    console.log(`❌ ${file} missing`);
  }
});

// Test 4: Check HTML meta tags
console.log('\n4. Checking HTML Meta Tags...');
try {
  const htmlPath = path.join(__dirname, '..', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  
  const requiredMetaTags = [
    'apple-mobile-web-app-capable',
    'apple-mobile-web-app-status-bar-style',
    'apple-mobile-web-app-title',
    'mobile-web-app-capable',
    'application-name'
  ];
  
  requiredMetaTags.forEach(tag => {
    if (html.includes(tag)) {
      console.log(`✅ ${tag} meta tag present`);
    } else {
      console.log(`❌ ${tag} meta tag missing`);
    }
  });
  
  if (html.includes('manifest.webmanifest')) {
    console.log('✅ Manifest link present');
  } else {
    console.log('❌ Manifest link missing');
  }
  
} catch (error) {
  console.log('❌ Error reading HTML:', error.message);
}

// Test 5: Check Vite PWA configuration
console.log('\n5. Checking Vite PWA Configuration...');
try {
  const viteConfigPath = path.join(__dirname, '..', 'vite.config.ts');
  const viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
  
  if (viteConfig.includes('VitePWA')) {
    console.log('✅ VitePWA plugin configured');
  } else {
    console.log('❌ VitePWA plugin not found');
  }
  
  if (viteConfig.includes('navigateFallback')) {
    console.log('✅ Offline fallback configured');
  } else {
    console.log('⚠️  Offline fallback not configured');
  }
  
  if (viteConfig.includes('skipWaiting: false') && viteConfig.includes('clientsClaim: false')) {
    console.log('✅ Service worker lifecycle properly configured');
  } else {
    console.log('⚠️  Service worker lifecycle configuration needs attention');
  }
  
} catch (error) {
  console.log('❌ Error reading Vite config:', error.message);
}

// Test 6: Check PWA components
console.log('\n6. Checking PWA Components...');
const pwaComponents = [
  'src/hooks/usePWA.ts',
  'src/components/PWAPrompt.tsx',
  'src/components/PWAInstallButton.tsx',
  'src/components/PWAStatus.tsx',
  'src/hooks/useNetworkStatus.ts'
];

pwaComponents.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
  }
});

// Recommendations
console.log('\n📋 PWA Recommendations:');
console.log('1. Test the app in Chrome DevTools Lighthouse for PWA score');
console.log('2. Test installation on mobile devices (iOS Safari, Android Chrome)');
console.log('3. Test offline functionality by going offline in DevTools');
console.log('4. Verify push notifications work correctly');
console.log('5. Test service worker updates and caching strategies');
console.log('6. Check that the app works in standalone mode');

console.log('\n🔧 PWA Testing Commands:');
console.log('npm run build && npm run preview  # Test production build');
console.log('npx lighthouse http://localhost:4173 --view  # Run Lighthouse audit');
console.log('npx workbox-cli wizard  # Generate service worker');

console.log('\n✨ PWA Testing Complete!');
