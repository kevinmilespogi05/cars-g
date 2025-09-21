import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { authenticatedRequest } from '../lib/jwt';
import { useChat } from '../hooks/useChat';
import { getApiUrl } from '../lib/config';

export function JWTTest() {
  const { user, isAuthenticated, signInWithJWT, signOut, checkJWTAuthentication } = useAuthStore();
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  
  // Test chat functionality
  const { 
    messages, 
    isConnected: chatConnected, 
    sendMessage, 
    startTyping, 
    stopTyping 
  } = useChat({
    conversationId: 'test-conversation',
    autoConnect: true,
    onMessageReceived: (message) => {
      setTestResult(prev => prev + `\n📨 New message: ${message.content} (from ${message.sender?.username || 'Unknown'})`);
    }
  });

  const testProtectedEndpoint = async () => {
    setIsLoading(true);
    setTestResult('Testing...');
    
    try {
      const response = await authenticatedRequest(getApiUrl('/api/auth/test'));
      const data = await response.json();
      
      if (response.ok) {
        setTestResult(`✅ Success: ${data.message}`);
      } else {
        setTestResult(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setTestResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testAdminEndpoint = async () => {
    setIsLoading(true);
    setTestResult('Testing admin endpoint...');
    
    try {
      const response = await authenticatedRequest(getApiUrl('/api/auth/admin-test'));
      const data = await response.json();
      
      if (response.ok) {
        setTestResult(`✅ Admin Success: ${data.message}`);
      } else {
        setTestResult(`❌ Admin Error: ${data.error}`);
      }
    } catch (error) {
      setTestResult(`❌ Admin Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testJWTStatus = () => {
    const jwtAuth = checkJWTAuthentication();
    setTestResult(`JWT Authentication Status: ${jwtAuth ? '✅ Authenticated' : '❌ Not Authenticated'}`);
  };

  const testChatConnection = () => {
    setTestResult(`Chat Connection Status: ${chatConnected ? '✅ Connected' : '❌ Not Connected'}`);
  };

  const sendTestMessage = async () => {
    if (!testMessage.trim()) {
      setTestResult('Please enter a test message');
      return;
    }

    try {
      await sendMessage(testMessage.trim());
      setTestResult(prev => prev + `\n📤 Sent message: ${testMessage}`);
      setTestMessage('');
    } catch (error) {
      setTestResult(prev => prev + `\n❌ Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testTypingIndicator = () => {
    startTyping();
    setTestResult(prev => prev + '\n⌨️ Started typing indicator...');
    
    setTimeout(() => {
      stopTyping();
      setTestResult(prev => prev + '\n⌨️ Stopped typing indicator');
    }, 2000);
  };

  if (!isAuthenticated) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <h3 className="text-lg font-semibold mb-4">JWT Test Component</h3>
        <p className="text-gray-600 mb-4">Please log in to test JWT functionality.</p>
        <button
          onClick={() => signInWithJWT('test@example.com', 'password')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Test JWT Login
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-4">JWT Test Component</h3>
      
      <div className="mb-4">
        <p><strong>User:</strong> {user?.username} ({user?.email})</p>
        <p><strong>Role:</strong> {user?.role}</p>
        <p><strong>JWT Status:</strong> {checkJWTAuthentication() ? '✅ Authenticated' : '❌ Not Authenticated'}</p>
        <p><strong>Chat Status:</strong> {chatConnected ? '✅ Connected' : '❌ Not Connected'}</p>
        <p><strong>Messages:</strong> {messages.length}</p>
      </div>

      <div className="space-y-2 mb-4">
        <button
          onClick={testJWTStatus}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 mr-2"
        >
          Check JWT Status
        </button>
        
        <button
          onClick={testProtectedEndpoint}
          disabled={isLoading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 mr-2 disabled:opacity-50"
        >
          Test Protected Endpoint
        </button>
        
        <button
          onClick={testAdminEndpoint}
          disabled={isLoading}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 mr-2 disabled:opacity-50"
        >
          Test Admin Endpoint
        </button>
        
        <button
          onClick={testChatConnection}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
        >
          Test Chat Connection
        </button>
        
        <button
          onClick={testTypingIndicator}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 mr-2"
        >
          Test Typing Indicator
        </button>
        
        <button
          onClick={signOut}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Sign Out
        </button>
      </div>

      {/* Chat Testing Section */}
      <div className="mt-4 p-3 bg-white border rounded">
        <h4 className="font-semibold mb-2">Chat Testing</h4>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder="Enter test message..."
            className="flex-1 px-3 py-2 border rounded"
            onKeyPress={(e) => e.key === 'Enter' && sendTestMessage()}
          />
          <button
            onClick={sendTestMessage}
            disabled={!testMessage.trim() || !chatConnected}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Send Message
          </button>
        </div>
        <div className="text-sm text-gray-600">
          <p>Connected: {chatConnected ? '✅' : '❌'}</p>
          <p>Messages in conversation: {messages.length}</p>
        </div>
      </div>

      {testResult && (
        <div className="mt-4 p-3 bg-white border rounded">
          <strong>Test Result:</strong>
          <pre className="mt-1 text-sm whitespace-pre-wrap">{testResult}</pre>
        </div>
      )}
    </div>
  );
}
