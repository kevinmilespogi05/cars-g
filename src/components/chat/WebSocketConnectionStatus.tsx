import React from 'react';
import { Wifi, WifiOff, AlertCircle, Loader2 } from 'lucide-react';

interface WebSocketConnectionStatusProps {
  status: 'connected' | 'connecting' | 'disconnected';
  error?: string | null;
  showError?: boolean;
}

export const WebSocketConnectionStatus: React.FC<WebSocketConnectionStatusProps> = ({
  status,
  error,
  showError = false
}) => {
  // Debug logging
  React.useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
    console.log('🔍 WebSocket URL being used:', wsUrl);
    console.log('🔍 Environment variables:', {
      VITE_WS_URL: import.meta.env.VITE_WS_URL,
      NODE_ENV: import.meta.env.NODE_ENV,
      MODE: import.meta.env.MODE
    });
  }, []);

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'connecting':
        return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />;
      case 'disconnected':
        return <WifiOff className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'text-green-600';
      case 'connecting':
        return 'text-yellow-600';
      case 'disconnected':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="flex items-center space-x-2 text-sm">
      {getStatusIcon()}
      <span className={getStatusColor()}>{getStatusText()}</span>
      
      {showError && error && (
        <div className="flex items-center space-x-1 text-red-600">
          <AlertCircle className="w-3 h-3" />
          <span className="text-xs">{error}</span>
        </div>
      )}
    </div>
  );
}; 