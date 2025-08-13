import React from 'react';
import { Wifi, WifiOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useWebSocketChat } from '../../hooks/useWebSocketChat';

interface WebSocketConnectionStatusProps {
  showText?: boolean;
  className?: string;
}

export const WebSocketConnectionStatus: React.FC<WebSocketConnectionStatusProps> = ({ 
  showText = true, 
  className = '' 
}) => {
  const { connectionStatus, error, showConnectionError } = useWebSocketChat();

  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: <CheckCircle className="w-4 h-4 text-green-500" />,
          text: 'Connected',
          color: 'text-green-500',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-800'
        };
      case 'connecting':
        return {
          icon: <Wifi className="w-4 h-4 text-yellow-500 animate-pulse" />,
          text: 'Connecting...',
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          borderColor: 'border-yellow-200 dark:border-yellow-800'
        };
      case 'disconnected':
        return {
          icon: <WifiOff className="w-4 h-4 text-red-500" />,
          text: 'Disconnected',
          color: 'text-red-500',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800'
        };
      default:
        return {
          icon: <WifiOff className="w-4 h-4 text-gray-500" />,
          text: 'Unknown',
          color: 'text-gray-500',
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          borderColor: 'border-gray-200 dark:border-gray-800'
        };
    }
  };

  const statusConfig = getStatusConfig();

  if (showConnectionError && error) {
    return (
      <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${statusConfig.bgColor} ${statusConfig.borderColor} ${className}`}>
        <AlertCircle className="w-4 h-4 text-red-500" />
        {showText && (
          <span className="text-sm text-red-600 dark:text-red-400">
            Connection Error: {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {statusConfig.icon}
      {showText && (
        <span className={`text-sm font-medium ${statusConfig.color}`}>
          {statusConfig.text}
        </span>
      )}
    </div>
  );
}; 