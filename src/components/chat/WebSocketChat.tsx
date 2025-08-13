import React, { useState, useEffect } from 'react';
import { ChatRoom } from '../../types/chat';
import { WebSocketChatList } from './WebSocketChatList';
import { WebSocketChatRoom } from './WebSocketChatRoom';
import { websocketChatService } from '../../services/websocketChatService';
import { useAuthStore } from '../../store/authStore';
import { MessageSquare, Wifi, WifiOff, AlertCircle } from 'lucide-react';

export const WebSocketChat: React.FC = () => {
  const { user } = useAuthStore();
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [showConnectionError, setShowConnectionError] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Initialize WebSocket connection when user is authenticated
    websocketChatService.connect();

    // Setup connection status monitoring
    const unsubscribeConnection = websocketChatService.onConnectionStatus((status) => {
      setConnectionStatus(status as 'connected' | 'connecting' | 'disconnected');
      setShowConnectionError(status === 'disconnected');
    });

    const unsubscribeError = websocketChatService.onError((error) => {
      console.error('WebSocket error:', error);
      setShowConnectionError(true);
    });

    return () => {
      unsubscribeConnection();
      unsubscribeError();
      websocketChatService.destroy();
    };
  }, [user]);

  const handleRoomSelect = (room: ChatRoom) => {
    setSelectedRoom(room);
  };

  const handleRoomDelete = () => {
    setSelectedRoom(null);
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'connecting':
        return <Wifi className="w-4 h-4 text-yellow-500 animate-pulse" />;
      case 'disconnected':
        return <WifiOff className="w-4 h-4 text-red-500" />;
      default:
        return <WifiOff className="w-4 h-4 text-gray-500" />;
    }
  };

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Sign in to access chat
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Please sign in to start chatting with other users.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex h-full">
      {/* Chat List */}
      <WebSocketChatList
        onRoomSelect={handleRoomSelect}
        selectedRoomId={selectedRoom?.id}
      />

      {/* Chat Room */}
      <div className="flex-1 flex flex-col">
        {selectedRoom ? (
          <WebSocketChatRoom
            roomId={selectedRoom.id}
            roomName={selectedRoom.name || 'Unnamed Room'}
            onDelete={handleRoomDelete}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Select a chat room
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Choose a room from the list to start chatting.
              </p>
              
              {showConnectionError && (
                <div className="mt-4 flex items-center justify-center space-x-2 text-red-500">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Connection lost. Trying to reconnect...</span>
                </div>
              )}
              
              <div className="mt-4 flex items-center justify-center space-x-2 text-gray-500">
                {getConnectionStatusIcon()}
                <span className="text-sm capitalize">{connectionStatus}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 