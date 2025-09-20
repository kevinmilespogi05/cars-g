import React from 'react';
import { Wifi, WifiOff, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface ConnectionStatusProps {
  isConnected: boolean;
  isAuthenticated: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor';
  lastError?: string;
  onRetry?: () => void;
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  isAuthenticated,
  connectionQuality,
  lastError,
  onRetry,
  className = ''
}) => {
  const getStatusIcon = () => {
    if (!isConnected) {
      return <WifiOff size={16} className="text-red-500" />;
    }
    
    if (!isAuthenticated) {
      return <Clock size={16} className="text-yellow-500" />;
    }
    
    switch (connectionQuality) {
      case 'excellent':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'good':
        return <Wifi size={16} className="text-yellow-500" />;
      case 'poor':
        return <AlertCircle size={16} className="text-red-500" />;
      default:
        return <Wifi size={16} className="text-gray-500" />;
    }
  };

  const getStatusText = () => {
    if (!isConnected) return 'Disconnected';
    if (!isAuthenticated) return 'Connecting...';
    
    switch (connectionQuality) {
      case 'excellent':
        return 'Real-time';
      case 'good':
        return 'Good';
      case 'poor':
        return 'Poor';
      default:
        return 'Connected';
    }
  };

  const getStatusColor = () => {
    if (!isConnected) return 'text-red-600';
    if (!isAuthenticated) return 'text-yellow-600';
    
    switch (connectionQuality) {
      case 'excellent':
        return 'text-green-600';
      case 'good':
        return 'text-yellow-600';
      case 'poor':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {getStatusIcon()}
      <span className={`text-sm font-medium ${getStatusColor()}`}>
        {getStatusText()}
      </span>
      
      {lastError && (
        <div className="flex items-center space-x-1">
          <AlertCircle size={12} className="text-red-500" />
          <span className="text-xs text-red-600 truncate max-w-32" title={lastError}>
            {lastError}
          </span>
        </div>
      )}
      
      {!isConnected && onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-blue-600 hover:text-blue-800 underline"
          title="Retry connection"
        >
          Retry
        </button>
      )}
    </div>
  );
};
