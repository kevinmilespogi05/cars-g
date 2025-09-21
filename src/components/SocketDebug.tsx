import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { getAccessToken, isAuthenticated as isJWTAuthenticated } from '../lib/jwt';
import { socketManager } from '../lib/socket';

export function SocketDebug() {
  const { user, isAuthenticated } = useAuthStore();
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [socketConnected, setSocketConnected] = useState(false);

  const addDebugInfo = (info: string) => {
    setDebugInfo(prev => prev + `\n${new Date().toLocaleTimeString()}: ${info}`);
  };

  const testSocketConnection = async () => {
    addDebugInfo('Starting socket connection test...');
    
    try {
      // Check JWT authentication
      const jwtAuth = isJWTAuthenticated();
      const token = getAccessToken();
      
      addDebugInfo(`JWT Authenticated: ${jwtAuth}`);
      addDebugInfo(`Access Token Available: ${!!token}`);
      addDebugInfo(`Token Length: ${token?.length || 0}`);
      
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          addDebugInfo(`Token Payload: ${JSON.stringify(payload, null, 2)}`);
        } catch (error) {
          addDebugInfo(`Token Decode Error: ${error}`);
        }
      }
      
      // Check Supabase session
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );
      
      const { data: { session } } = await supabase.auth.getSession();
      addDebugInfo(`Supabase Session: ${!!session}`);
      addDebugInfo(`Supabase User ID: ${session?.user?.id || 'None'}`);
      
      // Test socket connection
      addDebugInfo('Attempting socket connection...');
      await socketManager.connect();
      
      const socket = socketManager.getSocket();
      if (socket) {
        addDebugInfo(`Socket Connected: ${socket.connected}`);
        addDebugInfo(`Socket ID: ${socket.id}`);
        setSocketConnected(socket.connected);
      }
      
    } catch (error) {
      addDebugInfo(`Socket connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const disconnectSocket = async () => {
    addDebugInfo('Disconnecting socket...');
    await socketManager.disconnect();
    setSocketConnected(false);
    addDebugInfo('Socket disconnected');
  };

  useEffect(() => {
    addDebugInfo('SocketDebug component mounted');
    addDebugInfo(`User authenticated: ${isAuthenticated}`);
    addDebugInfo(`User ID: ${user?.id || 'None'}`);
    
    // Check if socket is already connected
    const socket = socketManager.getSocket();
    if (socket) {
      addDebugInfo(`Initial socket status: ${socket.connected}`);
      setSocketConnected(socket.connected);
      
      // Set up event listeners for debugging
      const handleConnect = () => {
        addDebugInfo('Socket connected event received');
        setSocketConnected(true);
      };
      
      const handleDisconnect = (reason: string) => {
        addDebugInfo(`Socket disconnected: ${reason}`);
        setSocketConnected(false);
      };
      
      const handleAuthenticated = (data: any) => {
        addDebugInfo(`Socket authenticated: ${JSON.stringify(data)}`);
      };
      
      const handleAuthError = (data: any) => {
        addDebugInfo(`Socket auth error: ${JSON.stringify(data)}`);
      };
      
      const handleConnectError = (error: Error) => {
        addDebugInfo(`Socket connect error: ${error.message}`);
      };
      
      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('authenticated', handleAuthenticated);
      socket.on('auth_error', handleAuthError);
      socket.on('connect_error', handleConnectError);
      
      // Cleanup function
      return () => {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('authenticated', handleAuthenticated);
        socket.off('auth_error', handleAuthError);
        socket.off('connect_error', handleConnectError);
      };
    }
  }, [isAuthenticated, user?.id]);

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-4">Socket Debug Component</h3>
      
      <div className="mb-4">
        <p><strong>User:</strong> {user?.username} ({user?.email})</p>
        <p><strong>Authenticated:</strong> {isAuthenticated ? '✅' : '❌'}</p>
        <p><strong>Socket Connected:</strong> {socketConnected ? '✅' : '❌'}</p>
      </div>

      <div className="space-y-2 mb-4">
        <button
          onClick={testSocketConnection}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
        >
          Test Socket Connection
        </button>
        
        <button
          onClick={disconnectSocket}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 mr-2"
        >
          Disconnect Socket
        </button>
        
        <button
          onClick={() => setDebugInfo('')}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Clear Debug Info
        </button>
      </div>

      {debugInfo && (
        <div className="mt-4 p-3 bg-white border rounded">
          <strong>Debug Information:</strong>
          <pre className="mt-1 text-sm whitespace-pre-wrap">{debugInfo}</pre>
        </div>
      )}
    </div>
  );
}
