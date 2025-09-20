#!/usr/bin/env node

/**
 * WebSocket Test Script for Real-time Chat
 * This script tests the WebSocket connection and real-time message delivery
 */

const { io } = require('socket.io-client');

const SERVER_URL = process.env.CHAT_SERVER_URL || 'http://localhost:3001';
const TEST_USER_ID = 'test-user-' + Date.now();

console.log('🧪 Testing WebSocket Real-time Chat...');
console.log(`📡 Server URL: ${SERVER_URL}`);
console.log(`👤 Test User ID: ${TEST_USER_ID}`);

// Test configuration
const tests = [
  {
    name: 'Connection Test',
    test: async (socket) => {
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve({ success: false, error: 'Connection timeout' });
        }, 5000);

        socket.on('connect', () => {
          clearTimeout(timeout);
          resolve({ success: true, message: 'Connected successfully' });
        });

        socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          resolve({ success: false, error: error.message });
        });
      });
    }
  },
  {
    name: 'Authentication Test',
    test: async (socket) => {
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve({ success: false, error: 'Authentication timeout' });
        }, 5000);

        socket.on('authenticated', (data) => {
          clearTimeout(timeout);
          resolve({ success: true, message: 'Authenticated successfully', data });
        });

        socket.on('auth_error', (error) => {
          clearTimeout(timeout);
          resolve({ success: false, error: error.message });
        });

        socket.emit('authenticate', TEST_USER_ID);
      });
    }
  },
  {
    name: 'Message Delivery Test',
    test: async (socket) => {
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve({ success: false, error: 'Message delivery timeout' });
        }, 10000);

        const testMessage = {
          conversation_id: 'test-conversation',
          sender_id: TEST_USER_ID,
          content: 'Test message for real-time delivery',
          message_type: 'text'
        };

        socket.on('new_message', (message) => {
          clearTimeout(timeout);
          if (message.content === testMessage.content) {
            resolve({ success: true, message: 'Message delivered in real-time', data: message });
          } else {
            resolve({ success: false, error: 'Received different message' });
          }
        });

        socket.on('message_error', (error) => {
          clearTimeout(timeout);
          resolve({ success: false, error: error.message });
        });

        // Join test conversation
        socket.emit('join_conversation', 'test-conversation');
        
        // Send test message
        setTimeout(() => {
          socket.emit('send_message', testMessage, (response) => {
            if (!response.success) {
              clearTimeout(timeout);
              resolve({ success: false, error: response.error || 'Failed to send message' });
            }
          });
        }, 1000);
      });
    }
  },
  {
    name: 'Connection Quality Test',
    test: async (socket) => {
      return new Promise((resolve) => {
        const startTime = Date.now();
        let pongCount = 0;
        const maxPongs = 3;

        socket.on('pong', () => {
          pongCount++;
          if (pongCount >= maxPongs) {
            const avgLatency = (Date.now() - startTime) / maxPongs;
            const quality = avgLatency < 50 ? 'excellent' : avgLatency < 200 ? 'good' : 'poor';
            resolve({ 
              success: true, 
              message: `Connection quality: ${quality} (${Math.round(avgLatency)}ms avg)`,
              data: { latency: avgLatency, quality }
            });
          }
        });

        // Send pings
        for (let i = 0; i < maxPongs; i++) {
          setTimeout(() => {
            socket.emit('ping');
          }, i * 1000);
        }

        setTimeout(() => {
          resolve({ success: false, error: 'Ping test timeout' });
        }, 10000);
      });
    }
  }
];

async function runTests() {
  const socket = io(SERVER_URL, {
    transports: ['websocket', 'polling'],
    autoConnect: false,
    timeout: 10000,
    forceNew: true
  });

  console.log('\n🚀 Starting WebSocket tests...\n');

  let passedTests = 0;
  let totalTests = tests.length;

  for (const test of tests) {
    console.log(`⏳ Running: ${test.name}`);
    
    try {
      const result = await test.test(socket);
      
      if (result.success) {
        console.log(`✅ ${test.name}: ${result.message}`);
        if (result.data) {
          console.log(`   📊 Data:`, result.data);
        }
        passedTests++;
      } else {
        console.log(`❌ ${test.name}: ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
    }
    
    console.log(''); // Empty line for readability
  }

  // Cleanup
  socket.disconnect();

  // Results
  console.log('📊 Test Results:');
  console.log(`   ✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`   ❌ Failed: ${totalTests - passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! WebSocket is working correctly for real-time chat.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Check the WebSocket configuration.');
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('\n💥 Uncaught exception:', error.message);
  process.exit(1);
});

// Run tests
runTests().catch((error) => {
  console.error('\n💥 Test runner error:', error.message);
  process.exit(1);
});
