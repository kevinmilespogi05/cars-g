import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, Loader2 } from 'lucide-react';

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
  placeholder = "Type a message..."
}) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
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

  const handleSendMessage = async () => {
    if (message.trim() && !disabled && !isSending) {
      setIsSending(true);
      try {
        await onSendMessage(message);
        setMessage('');
        
        // Reset textarea height
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      } catch (error) {
        console.error('Error sending message:', error);
      } finally {
        setIsSending(false);
        
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
    <div className="p-4 bg-white border-t border-gray-200">
      <div className="flex items-end gap-3">
        {/* Input container */}
        <div className="flex-1 relative">
          <div className="relative bg-gray-50 rounded-3xl border border-gray-200 focus-within:border-blue-400 focus-within:bg-white transition-all duration-200 shadow-sm hover:shadow-md">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={placeholder}
              disabled={disabled || isSending}
              className={`w-full px-4 py-3 pr-20 bg-transparent rounded-3xl resize-none focus:outline-none transition-all duration-200 text-sm ${
                disabled || isSending
                  ? 'cursor-not-allowed text-gray-400' 
                  : 'text-gray-900 placeholder-gray-400'
              }`}
              rows={1}
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
            
            {/* Attachment and emoji buttons */}
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <button
                type="button"
                className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={disabled || isSending}
                title="Attach file"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={disabled || isSending}
                title="Add emoji"
              >
                <Smile className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Character counter for long messages */}
          {message.length > 200 && (
            <div className="absolute -bottom-5 right-2 text-xs text-gray-400">
              {message.length}/1000
            </div>
          )}
        </div>
        
        {/* Send button */}
        <button
          type="button"
          onClick={handleSendMessage}
          disabled={!message.trim() || disabled || isSending}
          className={`
            flex items-center justify-center flex-shrink-0
            w-12 h-12 rounded-full transition-all duration-200
            ${!message.trim() || disabled || isSending
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl'
            }
          `}
          title="Send message"
        >
          {isSending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
      
      {/* Helper text */}
      {!disabled && (
        <div className="mt-2 text-xs text-gray-400 px-1">
          Press Enter to send, Shift + Enter for new line
        </div>
      )}
    </div>
  );
};
