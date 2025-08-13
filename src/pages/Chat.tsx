import React from 'react';
import { WebSocketChat } from '../components/chat/WebSocketChat';

export const Chat: React.FC = () => {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Use the WebSocket Chat component */}
      <WebSocketChat />
    </div>
  );
}; 