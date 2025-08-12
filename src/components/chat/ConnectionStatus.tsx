import React from 'react';
import { Wifi, WifiOff, Loader } from 'lucide-react';
import { realTimeChatService } from '../../services/realTimeChatService';

interface ConnectionStatusProps {
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ className = '' }) => {
  const [status, setStatus] = React.useState<'connected' | 'connecting' | 'disconnected'>('disconnected');

  React.useEffect(() => {
    const checkStatus = () => {
      setStatus(realTimeChatService.getConnectionStatus());
    };

    // Check immediately
    checkStatus();

    // Check every 2 seconds
    const interval = setInterval(checkStatus, 2000);

    return () => clearInterval(interval);
  }, []);

  if (status === 'connected') {
    return null; // Don't show anything when connected
  }

  return (
    <div className={`flex items-center space-x-2 text-sm ${className}`}>
      {status === 'connecting' ? (
        <>
          <Loader className="w-4 h-4 animate-spin text-blue-600" />
          <span className="text-blue-600 font-medium">Connecting...</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 text-red-600" />
          <span className="text-red-600 font-medium">Connection lost</span>
        </>
      )}
    </div>
  );
}; 