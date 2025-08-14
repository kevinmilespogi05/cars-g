import React, { useState, useRef, useEffect } from 'react';
import { SendIcon, PaperclipIcon, ImageIcon, MapPinIcon } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (content: string, messageType: string) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onTypingStart,
  onTypingStop,
  disabled = false,
  placeholder = "Type a message...",
}) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleTyping = (value: string) => {
    setMessage(value);
    
    if (!isTyping) {
      setIsTyping(true);
      onTypingStart();
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onTypingStop();
    }, 1000);
  };

  const handleSendMessage = () => {
    if (!message.trim() || disabled) return;

    onSendMessage(message.trim(), 'text');
    setMessage('');
    setIsTyping(false);
    onTypingStop();
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // For now, we'll just send the file name as text
    // In a real app, you'd upload the file to storage and send the URL
    onSendMessage(`File: ${file.name}`, 'file');
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // For now, we'll just send the image name as text
    // In a real app, you'd upload the image to storage and send the URL
    onSendMessage(`Image: ${file.name}`, 'image');
    
    // Reset input
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleLocationShare = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          onSendMessage(`Location: ${latitude}, ${longitude}`, 'location');
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get your location');
        }
      );
    } else {
      alert('Geolocation is not supported by this browser');
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      {/* Attachment Menu */}
      {showAttachments && (
        <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => imageInputRef.current?.click()}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded transition-colors"
            >
              <ImageIcon size={16} />
              <span>Image</span>
            </button>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded transition-colors"
            >
              <PaperclipIcon size={16} />
              <span>File</span>
            </button>
            
            <button
              onClick={handleLocationShare}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded transition-colors"
            >
              <MapPinIcon size={16} />
              <span>Location</span>
            </button>
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileUpload}
        className="hidden"
        accept="*/*"
      />
      <input
        ref={imageInputRef}
        type="file"
        onChange={handleImageUpload}
        className="hidden"
        accept="image/*"
      />

      {/* Message Input */}
      <div className="flex items-end space-x-3">
        <button
          onClick={() => setShowAttachments(!showAttachments)}
          className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
            showAttachments 
              ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
          disabled={disabled}
          title="Attachments"
        >
          <PaperclipIcon size={20} />
        </button>

        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-200"
            rows={1}
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />
        </div>

        <button
          onClick={handleSendMessage}
          disabled={!message.trim() || disabled}
          className={`flex-shrink-0 p-2 rounded-lg transition-all duration-200 ${
            !message.trim() || disabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600 hover:scale-105'
          }`}
          title="Send message"
        >
          <SendIcon size={20} />
        </button>
      </div>

      {/* Typing indicator */}
      {isTyping && (
        <div className="mt-2 text-xs text-gray-500 flex items-center">
          <div className="flex space-x-1 mr-2">
            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          Typing...
        </div>
      )}
    </div>
  );
}; 