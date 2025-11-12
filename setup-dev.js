#!/usr/bin/env node

// Setup script for local development
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Setting up development environment...\n');

// Check if .env file exists
if (!fs.existsSync('.env')) {
  console.log('❌ .env file not found!');
  console.log('📋 Please create a .env file with the following variables:');
  console.log('');
  console.log('VITE_SUPABASE_URL=your_supabase_url');
  console.log('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
  console.log('FRONTEND_URL=http://localhost:3000');
  console.log('');
  console.log('🔧 Copy from env.example if available');
  process.exit(1);
}

console.log('✅ .env file found');

// Install dependencies for dev server
console.log('\n📦 Installing development dependencies...');
try {
  execSync('npm install express cors dotenv @supabase/supabase-js', { stdio: 'inherit' });
  console.log('✅ Dependencies installed');
} catch (error) {
  console.log('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

console.log('\n🎉 Setup complete!');
console.log('\n🚀 To start the development server:');
console.log('   node dev-server.js');
console.log('\n🧪 To run tests:');
console.log('   node test-local-dev.js');
console.log('\n📋 Make sure your .env file has all required variables!');
