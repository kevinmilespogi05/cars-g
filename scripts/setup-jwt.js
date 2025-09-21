#!/usr/bin/env node

/**
 * JWT Setup Script
 * Helps set up JWT configuration
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const JWT_SECRET = crypto.randomBytes(64).toString('hex');

console.log('🔐 JWT Setup Script');
console.log('==================\n');

console.log('Generated JWT Secret:');
console.log(JWT_SECRET);
console.log('\n');

// Check if server .env exists
const serverEnvPath = path.join(__dirname, '..', 'server', '.env');
const serverEnvExamplePath = path.join(__dirname, '..', 'server', '.env.example');

if (fs.existsSync(serverEnvPath)) {
  console.log('✅ Found server/.env file');
  
  // Read existing .env
  let envContent = fs.readFileSync(serverEnvPath, 'utf8');
  
  // Check if JWT_SECRET already exists
  if (envContent.includes('JWT_SECRET=')) {
    console.log('⚠️  JWT_SECRET already exists in server/.env');
    console.log('   Please update it manually with the new secret above');
  } else {
    // Add JWT configuration
    envContent += '\n# JWT Configuration\n';
    envContent += `JWT_SECRET=${JWT_SECRET}\n`;
    envContent += 'JWT_EXPIRES_IN=24h\n';
    envContent += 'JWT_REFRESH_EXPIRES_IN=7d\n';
    
    fs.writeFileSync(serverEnvPath, envContent);
    console.log('✅ Added JWT configuration to server/.env');
  }
} else if (fs.existsSync(serverEnvExamplePath)) {
  console.log('📝 Found server/.env.example file');
  console.log('   Copy server/.env.example to server/.env and add the JWT configuration');
} else {
  console.log('📝 No .env file found in server directory');
  console.log('   Create server/.env with the following content:');
  console.log('');
  console.log('# JWT Configuration');
  console.log(`JWT_SECRET=${JWT_SECRET}`);
  console.log('JWT_EXPIRES_IN=24h');
  console.log('JWT_REFRESH_EXPIRES_IN=7d');
  console.log('');
  console.log('# Add your other environment variables here');
}

console.log('\n🚀 Next steps:');
console.log('1. Make sure the JWT_SECRET is set in your server/.env file');
console.log('2. Restart your server');
console.log('3. Test JWT authentication with: npm run test:jwt');
console.log('\n🔒 Security Note:');
console.log('   Keep this JWT secret secure and never commit it to version control!');
