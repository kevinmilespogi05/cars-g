import React from 'react';
import { ConnectionStatus } from './ConnectionStatus';
import { realTimeChatService } from '../../services/realTimeChatService';
import { Wifi, Users, MessageSquare, Zap } from 'lucide-react';

export const RealTimeDemo: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = React.useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [stats, setStats] = React.useState({
    activeConnections: 0,
    messagesSent: 0,
    typingUsers: 0
  });

  React.useEffect(() => {
    const checkStatus = () => {
      setConnectionStatus(realTimeChatService.getConnectionStatus());
    };

    checkStatus();
    const interval = setInterval(checkStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'connecting':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'disconnected':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="w-4 h-4" />;
      case 'connecting':
        return <div className="w-4 h-4 animate-spin rounded-full border-2 border-yellow-600 border-t-transparent" />;
      case 'disconnected':
        return <div className="w-4 h-4 bg-red-600 rounded-full" />;
      default:
        return <div className="w-4 h-4 bg-gray-600 rounded-full" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <Zap className="w-5 h-5 text-blue-600" />
          <span>Real-Time Chat</span>
        </h3>
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor()}`}>
          {getStatusIcon()}
          <span className="capitalize">{connectionStatus}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <Wifi className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Connection</span>
          </div>
          <p className="text-lg font-bold text-blue-700 mt-1">
            {connectionStatus === 'connected' ? 'Active' : 'Inactive'}
          </p>
        </div>

        <div className="bg-green-50 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-900">Online Users</span>
          </div>
          <p className="text-lg font-bold text-green-700 mt-1">
            {stats.activeConnections}
          </p>
        </div>

        <div className="bg-purple-50 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-900">Messages</span>
          </div>
          <p className="text-lg font-bold text-purple-700 mt-1">
            {stats.messagesSent}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">WebSocket Status:</span>
          <span className={`font-medium ${
            connectionStatus === 'connected' ? 'text-green-600' : 
            connectionStatus === 'connecting' ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {connectionStatus === 'connected' ? '🟢 Connected' : 
             connectionStatus === 'connecting' ? '🟡 Connecting' : '🔴 Disconnected'}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Auto Reconnect:</span>
          <span className="text-green-600 font-medium">✅ Enabled</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Heartbeat:</span>
          <span className="text-green-600 font-medium">✅ Active</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Message Queue:</span>
          <span className="text-blue-600 font-medium">✅ Ready</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Real-Time Features:</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">Live Messages</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">Typing Indicators</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">Message Reactions</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">User Presence</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">Auto Reconnect</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">Message Queue</span>
          </div>
        </div>
      </div>
    </div>
  );
}; 