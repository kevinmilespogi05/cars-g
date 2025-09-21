import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTypingStart,
  onTypingStop,
  disabled = false,
  placeholder = "Type your message..."
}) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Handle typing indicators
    if (value.trim() && !isTyping) {
      setIsTyping(true);
      onTypingStart();
    } else if (!value.trim() && isTyping) {
      setIsTyping(false);
      onTypingStop();
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    if (value.trim()) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        onTypingStop();
      }, 1000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage('');
      
      // Stop typing indicator
      if (isTyping) {
        setIsTyping(false);
        onTypingStop();
      }
      
      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const handleFocus = () => {
    if (message.trim() && !isTyping) {
      setIsTyping(true);
      onTypingStart();
    }
  };

  const handleBlur = () => {
    if (isTyping) {
      setIsTyping(false);
      onTypingStop();
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="p-4 bg-gradient-to-r from-gray-50/80 to-white/80 border-t border-gray-200/60 backdrop-blur-sm">
      <div className="flex items-center space-x-3">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full px-4 py-3 pr-12 border border-gray-300/60 rounded-2xl resize-none focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 shadow-sm ${
              disabled 
                ? 'bg-gray-100 cursor-not-allowed text-gray-500' 
                : 'bg-white hover:shadow-md'
            }`}
            rows={1}
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
          
          {/* Attachment and emoji buttons */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
            <button
              className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-all duration-200"
              disabled={disabled}
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <button
              className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-all duration-200"
              disabled={disabled}
            >
              <Smile className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <button
          onClick={handleSendMessage}
          disabled={!message.trim() || disabled}
          className={`p-3 rounded-2xl transition-all duration-200 shadow-lg ${
            !message.trim() || disabled
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 hover:scale-105'
          }`}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
