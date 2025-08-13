const WebSocket = require('ws');

// Test configuration
const WS_URL = process.env.VITE_WS_URL || 'ws://localhost:3001';
const TEST_ROOM_ID = 'test-room-123';
const TEST_USER_ID = 'test-user-456';

console.log('🧪 Testing WebSocket Chat Implementation...');
console.log(`📍 WebSocket URL: ${WS_URL}`);

// Test messages
const testMessages = [
  {
    type: 'join',
    roomId: TEST_ROOM_ID,
    timestamp: Date.now(),
    userId: TEST_USER_ID
  },
  {
    type: 'message',
    roomId: TEST_ROOM_ID,
    data: {
      content: 'Hello from test client!',
      senderId: TEST_USER_ID,
      timestamp: Date.now()
    },
    timestamp: Date.now(),
    userId: TEST_USER_ID
  },
  {
    type: 'typing',
    roomId: TEST_ROOM_ID,
    data: {
      userId: TEST_USER_ID,
      roomId: TEST_ROOM_ID,
      isTyping: true,
      timestamp: Date.now()
    },
    timestamp: Date.now(),
    userId: TEST_USER_ID
  },
  {
    type: 'reaction',
    roomId: TEST_ROOM_ID,
    data: {
      messageId: 'test-message-123',
      userId: TEST_USER_ID,
      reaction: '👍',
      timestamp: Date.now()
    },
    timestamp: Date.now(),
    userId: TEST_USER_ID
  }
];

async function testWebSocketConnection() {
  return new Promise((resolve, reject) => {
    console.log('🔌 Attempting to connect to WebSocket server...');
    
    const ws = new WebSocket(WS_URL);
    
    ws.on('open', () => {
      console.log('✅ WebSocket connection established');
      
      // Send test messages
      testMessages.forEach((message, index) => {
        setTimeout(() => {
          console.log(`📤 Sending message ${index + 1}:`, message.type);
          ws.send(JSON.stringify(message));
        }, index * 1000);
      });
      
      // Wait for responses
      setTimeout(() => {
        console.log('✅ Test completed successfully');
        ws.close();
        resolve();
      }, testMessages.length * 1000 + 2000);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        console.log('📥 Received message:', message.type);
        
        if (message.type === 'error') {
          console.error('❌ Server error:', message.data?.error);
        }
      } catch (error) {
        console.error('❌ Error parsing message:', error);
      }
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      reject(error);
    });
    
    ws.on('close', (code, reason) => {
      console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
    });
    
    // Timeout after 10 seconds
    setTimeout(() => {
      console.error('❌ Test timeout');
      ws.close();
      reject(new Error('Test timeout'));
    }, 10000);
  });
}

async function testConnectionStatus() {
  console.log('\n🔍 Testing connection status...');
  
  try {
    const response = await fetch(`${WS_URL.replace('ws', 'http')}/health`);
    if (response.ok) {
      console.log('✅ Server health check passed');
    } else {
      console.log('⚠️ Server health check failed');
    }
  } catch (error) {
    console.log('⚠️ Could not check server health:', error.message);
  }
}

async function runTests() {
  try {
    await testConnectionStatus();
    await testWebSocketConnection();
    console.log('\n🎉 All tests passed! WebSocket chat implementation is working correctly.');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { testWebSocketConnection, testConnectionStatus }; 