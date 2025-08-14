import React, { useState, useEffect } from 'react';
import { ChatMessage as ChatMessageType } from '../types';
import { useAuthStore } from '../store/authStore';
import { formatDistanceToNow } from 'date-fns';
import { Trash2Icon, MoreVerticalIcon } from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessageType;
  profiles?: any[];
  onDeleteMessage?: (messageId: string) => void;
  canDelete?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  profiles = [], 
  onDeleteMessage,
  canDelete = false 
}) => {
  const { user } = useAuthStore();
  const isOwnMessage = message.sender_id === user?.id;
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);

  // Get sender details from profiles
  const sender = profiles.find(p => p.id === message.sender_id);

  // Close delete menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDeleteMenu && !event.target) {
        setShowDeleteMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDeleteMenu]);

  const formatMessageTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };

  const handleDeleteMessage = () => {
    if (onDeleteMessage && canDelete) {
      onDeleteMessage(message.id);
      setShowDeleteMenu(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteMenu(!showDeleteMenu);
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
        console.log('Rendering image message:', {
          content: message.content,
          messageType: message.message_type,
          messageId: message.id
        });
        
        // Handle legacy image messages (old format: "Image: filename.jpg")
        if (message.content && message.content.startsWith('Image: ')) {
          return (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="text-gray-400 text-xl">🖼️</div>
                <div>
                  <p className="text-sm text-gray-600">Legacy image message</p>
                  <p className="text-xs text-gray-500 mt-1">{message.content}</p>
                </div>
              </div>
            </div>
          );
        }
        
        // Validate that content is a valid URL
        if (!message.content || !message.content.startsWith('http')) {
          console.error('Invalid image URL:', message.content);
          return (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">Invalid image URL</p>
              <p className="text-xs text-red-500 mt-1">{message.content}</p>
            </div>
          );
        }
        
        return (
          <div className="max-w-xs">
            <img
              src={message.content}
              alt="Shared image"
              className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity border border-gray-200"
              onClick={() => window.open(message.content, '_blank')}
              onError={(e) => {
                console.error('Image failed to load:', message.content);
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="hidden p-2 bg-gray-100 border border-gray-200 rounded text-xs text-gray-500">
              Image failed to load: {message.content}
            </div>
          </div>
        );
      
      case 'file':
        // Handle legacy file messages (old format: "File: filename.ext")
        if (message.content && message.content.startsWith('File: ')) {
          return (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="text-gray-400 text-xl">📎</div>
                <div>
                  <p className="text-sm text-gray-600">Legacy file message</p>
                  <p className="text-xs text-gray-500 mt-1">{message.content}</p>
                </div>
              </div>
            </div>
          );
        }
        
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
        // Handle legacy location messages (old format: "Location: lat, lng")
        if (message.content && message.content.startsWith('Location: ')) {
          const coords = message.content.replace('Location: ', '').split(', ');
          const [lat, lng] = coords;
          
          return (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="text-gray-400 text-xl">📍</div>
                <div>
                  <p className="text-sm text-gray-600">Legacy location message</p>
                  <p className="text-xs text-gray-500 mt-1">Coordinates: {lat}, {lng}</p>
                  <button
                    onClick={() => window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank')}
                    className="mt-2 px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                  >
                    View on Map
                  </button>
                </div>
              </div>
            </div>
          );
        }
        
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
                className="mt-2 px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
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
            {sender?.avatar_url ? (
              <img
                src={sender.avatar_url}
                alt={sender.username}
                className="w-6 h-6 rounded-full object-cover border border-gray-200"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center border border-gray-200">
                <span className="text-gray-600 text-xs font-semibold">
                  {sender?.username?.charAt(0).toUpperCase() || message.sender_id.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <span className="text-xs text-gray-500 font-medium">
              {sender?.username || `User ${message.sender_id.slice(0, 8)}`}
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
          
          {/* Message Time and Delete Button */}
          <div className={`flex items-center justify-between mt-2 ${
            isOwnMessage ? 'text-white/80' : 'text-gray-500'
          }`}>
            <span className="text-xs">{formatMessageTime(message.created_at)}</span>
            
            {/* Delete Button for Own Messages */}
            {isOwnMessage && canDelete && onDeleteMessage && (
              <div className="relative">
                <button
                  onClick={handleDeleteClick}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                  title="Delete message"
                >
                  <MoreVerticalIcon size={12} />
                </button>
                
                {/* Delete Menu */}
                {showDeleteMenu && (
                  <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    <button
                      onClick={handleDeleteMessage}
                      className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-t-lg transition-colors"
                    >
                      <Trash2Icon size={14} />
                      <span>Delete for everyone</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 