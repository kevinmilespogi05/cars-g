// Test script for OTP-based registration system
// Run this to test all endpoints and flows

const BASE_URL = 'http://localhost:3000'; // Change to your Vercel URL for production testing

// Test data
const testUser = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'testuser@gmail.com',
  username: 'testuser123',
  phone: '+1234567890',
  password: 'testpassword123',
  confirmPassword: 'testpassword123',
  acceptTerms: true,
  idFrontImageUrl: 'https://example.com/front.jpg',
  idBackImageUrl: 'https://example.com/back.jpg'
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

// Test 1: Registration with valid data
async function testRegistration() {
  console.log('🧪 Testing Registration...');
  
  const result = await apiCall('/api/auth/register-otp', 'POST', testUser);
  
  if (result.status === 200 && result.data.success) {
    console.log('✅ Registration successful!');
    console.log('📧 Email sent:', result.data.data.emailSent);
    console.log('⏰ OTP expires:', result.data.data.otpExpiry);
    console.log('🔄 Next step:', result.data.data.nextStep);
    return result.data.data;
  } else {
    console.log('❌ Registration failed:', result.data?.error || result.error);
    return null;
  }
}

// Test 2: OTP verification with correct code
async function testOTPVerification(email, otp) {
  console.log('🧪 Testing OTP Verification...');
  
  const result = await apiCall('/api/auth/verify-otp', 'POST', { email, otp });
  
  if (result.status === 200 && result.data.success) {
    console.log('✅ OTP verification successful!');
    console.log('📊 Status:', result.data.data.verificationStatus);
    console.log('🔄 Next step:', result.data.data.nextStep);
    return true;
  } else {
    console.log('❌ OTP verification failed:', result.data?.error || result.error);
    return false;
  }
}

// Test 3: OTP verification with wrong code
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

// Test 4: Resend OTP
async function testResendOTP(email) {
  console.log('🧪 Testing Resend OTP...');
  
  const result = await apiCall('/api/auth/resend-otp', 'POST', { email });
  
  if (result.status === 200 && result.data.success) {
    console.log('✅ OTP resent successfully!');
    console.log('📧 Email sent:', result.data.data.emailSent);
    console.log('⏰ New expiry:', result.data.data.otpExpiry);
    return true;
  } else {
    console.log('❌ Resend failed:', result.data?.error || result.error);
    return false;
  }
}

// Test 5: Invalid email domain
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

// Test 6: Missing required fields
async function testMissingFields() {
  console.log('🧪 Testing Missing Fields...');
  
  const incompleteUser = { firstName: 'John' }; // Missing required fields
  const result = await apiCall('/api/auth/register-otp', 'POST', incompleteUser);
  
  if (result.status === 400 && result.data.code === 'MISSING_FIELDS') {
    console.log('✅ Missing fields correctly rejected!');
    console.log('📋 Missing:', result.data.missingFields);
    return true;
  } else {
    console.log('❌ Missing fields test failed:', result.data?.error || result.error);
    return false;
  }
}

// Test 7: Password mismatch
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

// Test 8: Rate limiting on resend
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
  
  let passedTests = 0;
  let totalTests = 0;
  
  // Test 1: Registration
  totalTests++;
  const registrationResult = await testRegistration();
  if (registrationResult) {
    passedTests++;
  }
  console.log('');
  
  // Test 2: Invalid email domain
  totalTests++;
  if (await testInvalidEmail()) {
    passedTests++;
  }
  console.log('');
  
  // Test 3: Missing fields
  totalTests++;
  if (await testMissingFields()) {
    passedTests++;
  }
  console.log('');
  
  // Test 4: Password mismatch
  totalTests++;
  if (await testPasswordMismatch()) {
    passedTests++;
  }
  console.log('');
  
  // Test 5: OTP verification (if registration was successful)
  if (registrationResult) {
    totalTests++;
    // Note: You'll need to check the actual OTP from the email
    console.log('📧 Check your email for the OTP code and enter it below:');
    console.log('   (In a real test, you would extract the OTP from the email)');
    console.log('   For now, we\'ll test with a dummy OTP...');
    
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
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  runTests().catch(console.error);
}

// Export for use in other test files
export { runTests, testRegistration, testOTPVerification, testResendOTP };
