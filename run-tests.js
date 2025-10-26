#!/usr/bin/env node

// Simple test runner for OTP registration system
// Usage: node run-tests.js

const BASE_URL = process.env.TEST_BASE_URL || 'https://cars-g.vercel.app';

// Test data
const testUser = {
  firstName: 'Test',
  lastName: 'User',
  email: 'testuser@gmail.com',
  username: 'testuser123',
  phone: '+1234567890',
  password: 'testpassword123',
  confirmPassword: 'testpassword123',
  acceptTerms: true
};

// Helper function to make API calls
async function apiCall(endpoint, method = 'POST', data = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, options);
    const result = await response.json();
    return { status: response.status, data: result };
  } catch (error) {
    return { status: 0, error: error.message };
  }
}

// Test functions
async function testRegistration() {
  console.log('🧪 Testing Registration...');
  
  const result = await apiCall('/api/auth/register-otp', 'POST', testUser);
  
  if (result.status === 200 && result.data.success) {
    console.log('✅ Registration successful!');
    console.log('📧 Email sent:', result.data.data.emailSent);
    console.log('⏰ OTP expires:', result.data.data.otpExpiry);
    return result.data.data;
  } else {
    console.log('❌ Registration failed:', result.data?.error || result.error);
    return null;
  }
}

async function testInvalidEmail() {
  console.log('🧪 Testing Invalid Email Domain...');
  
  const invalidUser = { ...testUser, email: 'test@yahoo.com' };
  const result = await apiCall('/api/auth/register-otp', 'POST', invalidUser);
  
  if (result.status === 400 && result.data.code === 'INVALID_EMAIL_DOMAIN') {
    console.log('✅ Invalid email domain correctly rejected!');
    return true;
  } else {
    console.log('❌ Invalid email test failed:', result.data?.error || result.error);
    return false;
  }
}

async function testMissingFields() {
  console.log('🧪 Testing Missing Fields...');
  
  const incompleteUser = { firstName: 'John' };
  const result = await apiCall('/api/auth/register-otp', 'POST', incompleteUser);
  
  if (result.status === 400 && result.data.code === 'MISSING_FIELDS') {
    console.log('✅ Missing fields correctly rejected!');
    return true;
  } else {
    console.log('❌ Missing fields test failed:', result.data?.error || result.error);
    return false;
  }
}

async function testPasswordMismatch() {
  console.log('🧪 Testing Password Mismatch...');
  
  const mismatchUser = { ...testUser, confirmPassword: 'differentpassword' };
  const result = await apiCall('/api/auth/register-otp', 'POST', mismatchUser);
  
  if (result.status === 400 && result.data.code === 'PASSWORD_MISMATCH') {
    console.log('✅ Password mismatch correctly rejected!');
    return true;
  } else {
    console.log('❌ Password mismatch test failed:', result.data?.error || result.error);
    return false;
  }
}

async function testWrongOTP(email) {
  console.log('🧪 Testing Wrong OTP...');
  
  const result = await apiCall('/api/auth/verify-otp', 'POST', { email, otp: '999999' });
  
  if (result.status === 400 && result.data.code === 'INVALID_OTP') {
    console.log('✅ Wrong OTP correctly rejected!');
    return true;
  } else {
    console.log('❌ Wrong OTP test failed:', result.data?.error || result.error);
    return false;
  }
}

async function testResendOTP(email) {
  console.log('🧪 Testing Resend OTP...');
  
  const result = await apiCall('/api/auth/resend-otp', 'POST', { email });
  
  if (result.status === 200 && result.data.success) {
    console.log('✅ OTP resent successfully!');
    return true;
  } else {
    console.log('❌ Resend failed:', result.data?.error || result.error);
    return false;
  }
}

async function testRateLimiting(email) {
  console.log('🧪 Testing Rate Limiting...');
  
  // First resend
  await apiCall('/api/auth/resend-otp', 'POST', { email });
  
  // Immediate second resend (should be rate limited)
  const result = await apiCall('/api/auth/resend-otp', 'POST', { email });
  
  if (result.status === 429 && result.data.code === 'RATE_LIMITED') {
    console.log('✅ Rate limiting working correctly!');
    return true;
  } else {
    console.log('❌ Rate limiting test failed:', result.data?.error || result.error);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting OTP Registration System Tests...\n');
  console.log(`🌐 Testing against: ${BASE_URL}\n`);
  
  let passedTests = 0;
  let totalTests = 0;
  
  // Test 1: Invalid email domain
  totalTests++;
  if (await testInvalidEmail()) {
    passedTests++;
  }
  console.log('');
  
  // Test 2: Missing fields
  totalTests++;
  if (await testMissingFields()) {
    passedTests++;
  }
  console.log('');
  
  // Test 3: Password mismatch
  totalTests++;
  if (await testPasswordMismatch()) {
    passedTests++;
  }
  console.log('');
  
  // Test 4: Registration
  totalTests++;
  const registrationResult = await testRegistration();
  if (registrationResult) {
    passedTests++;
  }
  console.log('');
  
  // Test 5: Wrong OTP (if registration was successful)
  if (registrationResult) {
    totalTests++;
    if (await testWrongOTP(registrationResult.email)) {
      passedTests++;
    }
    console.log('');
  }
  
  // Test 6: Resend OTP (if registration was successful)
  if (registrationResult) {
    totalTests++;
    if (await testResendOTP(registrationResult.email)) {
      passedTests++;
    }
    console.log('');
  }
  
  // Test 7: Rate limiting (if resend was successful)
  if (registrationResult) {
    totalTests++;
    if (await testRateLimiting(registrationResult.email)) {
      passedTests++;
    }
    console.log('');
  }
  
  // Test Summary
  console.log('📊 Test Results:');
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! The OTP registration system is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Please check the implementation.');
  }
  
  console.log('\n📧 Note: Check your email for the OTP code to test manual verification.');
  console.log('🔗 Use the manual testing guide for complete testing scenarios.');
}

// Run tests
runTests().catch(console.error);
