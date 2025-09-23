import fetch from 'node-fetch';

async function testEmailVerification() {
  try {
    console.log('🧪 Testing email verification endpoints...\n');

    // Test 1: Send verification code
    console.log('1. Testing send verification endpoint...');
    const sendResponse = await fetch('http://localhost:3001/api/auth/send-verification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        username: 'testuser'
      })
    });

    const sendData = await sendResponse.json();
    console.log('   Status:', sendResponse.status);
    console.log('   Response:', JSON.stringify(sendData, null, 2));

    if (sendData.success) {
      console.log('   ✅ Send verification endpoint working!\n');
      
      // Test 2: Check verification status
      console.log('2. Testing verification status endpoint...');
      const statusResponse = await fetch('http://localhost:3001/api/auth/verification-status/test@example.com');
      const statusData = await statusResponse.json();
      console.log('   Status:', statusResponse.status);
      console.log('   Response:', JSON.stringify(statusData, null, 2));
      
      if (statusData.success) {
        console.log('   ✅ Verification status endpoint working!\n');
      }
    }

    // Test 3: Verify email with dummy code
    console.log('3. Testing verify email endpoint...');
    const verifyResponse = await fetch('http://localhost:3001/api/auth/verify-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        code: '123456'
      })
    });

    const verifyData = await verifyResponse.json();
    console.log('   Status:', verifyResponse.status);
    console.log('   Response:', JSON.stringify(verifyData, null, 2));

    console.log('\n🎉 Email verification system test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testEmailVerification();
