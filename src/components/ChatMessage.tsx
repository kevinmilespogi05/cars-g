import React from 'react';
import { ChatMessage as ChatMessageType } from '../types';
import { useAuthStore } from '../store/authStore';
import { formatDistanceToNow } from 'date-fns';

interface ChatMessageProps {
  message: ChatMessageType;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const { user } = useAuthStore();
  const isOwnMessage = message.sender_id === user?.id;

  const formatMessageTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };

  const renderMessageContent = () => {
    switch (message.message_type) {
      case 'text':
        return (
          <p className="text-sm leading-relaxed break-words">
            {message.content}
          </p>
        );
      
      case 'image':
        return (
          <div className="max-w-xs">
            <img
              src={message.content}
              alt="Shared image"
              className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity border border-gray-200"
              onClick={() => window.open(message.content, '_blank')}
            />
          </div>
        );
      
      case 'file':
        return (
          <div className="flex items-center space-x-2 p-3 bg-gray-100 rounded-lg border border-gray-200">
            <div className="text-blue-500 text-xl">
              📎
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {message.metadata?.filename || 'File'}
              </p>
              <p className="text-xs text-gray-500">
                {message.metadata?.size ? `${(message.metadata.size / 1024).toFixed(1)} KB` : 'Unknown size'}
              </p>
            </div>
            <button
              onClick={() => window.open(message.content, '_blank')}
              className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Download
            </button>
          </div>
        );
      
      case 'location':
        return (
          <div className="p-3 bg-gray-100 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-2">
              <div className="text-red-500 text-xl">📍</div>
              <div>
                <p className="text-sm font-medium text-gray-900">Location shared</p>
                <p className="text-xs text-gray-500">
                  {message.metadata?.address || 'Unknown location'}
                </p>
              </div>
            </div>
            {message.metadata?.coordinates && (
              <button
                onClick={() => {
                  const [lat, lng] = message.metadata.coordinates;
                  window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank');
                }}
                className="mt-2 px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
              >
                View on Map
              </button>
            )}
          </div>
        );
      
      default:
        return (
          <p className="text-sm text-gray-500 italic">
            Unsupported message type: {message.message_type}
          </p>
        );
    }
  };

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'order-2' : 'order-1'}`}>
        {/* Avatar and Username */}
        {!isOwnMessage && (
          <div className="flex items-center space-x-2 mb-2">
            {message.sender?.avatar_url ? (
              <img
                src={message.sender.avatar_url}
                alt={message.sender.username}
                className="w-6 h-6 rounded-full object-cover border border-gray-200"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center border border-gray-200">
                <span className="text-gray-600 text-xs font-semibold">
                  {message.sender?.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
            )}
            <span className="text-xs text-gray-500 font-medium">
              {message.sender?.username || 'Unknown User'}
            </span>
          </div>
        )}
        
        {/* Message Bubble */}
        <div
          className={`
            p-3 rounded-lg shadow-sm border
            ${isOwnMessage 
              ? 'bg-blue-500 text-white rounded-br-md border-blue-500' 
              : 'bg-white text-gray-900 rounded-bl-md border-gray-200'
            }
          `}
        >
          {renderMessageContent()}
          
          {/* Message Time */}
          <div className={`text-xs mt-2 ${
            isOwnMessage ? 'text-white/80' : 'text-gray-500'
          }`}>
            {formatMessageTime(message.created_at)}
          </div>
        </div>
      </div>
    </div>
  );
}; 