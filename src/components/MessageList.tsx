import React from 'react';
import { ChatMessage } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Check, CheckCheck } from 'lucide-react';

interface MessageListProps {
  messages: ChatMessage[];
  currentUserId?: string;
  isTyping: boolean;
  typingUser: string | null;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  isTyping,
  typingUser
}) => {
  const formatMessageTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Just now';
    }
  };

  const getMessageAlignment = (message: ChatMessage) => {
    return message.sender_id === currentUserId ? 'right' : 'left';
  };

  const getMessageStyle = (message: ChatMessage) => {
    const isOwn = message.sender_id === currentUserId;
    return isOwn
      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
      : 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-900 border border-gray-200 shadow-sm';
  };

  return (
    <div className="flex-1 p-3 space-y-2">
      {messages.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center shadow-lg">
            <MessageCircle className="w-10 h-10 text-blue-500" />
          </div>
          <p className="text-base font-semibold text-gray-700 mb-2">
            No messages yet
          </p>
          <p className="text-sm text-gray-500">
            Start a conversation with admin
          </p>
        </div>
      ) : (
        messages.map((message, index) => {
          const alignment = getMessageAlignment(message);
          const messageStyle = getMessageStyle(message);
          const isOwn = message.sender_id === currentUserId;

          return (
            <div
              key={message.id}
              className={`flex ${alignment === 'right' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[80%] px-4 py-3 rounded-3xl ${messageStyle} relative shadow-md`}
              >
                <p className="text-sm break-words leading-relaxed font-medium">{message.message}</p>
                
                <div className={`flex items-center justify-between mt-2 ${
                  isOwn ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  <p className="text-xs font-medium">
                    {formatMessageTime(message.created_at)}
                  </p>
                  {isOwn && (
                    <div className="flex items-center ml-2">
                      {message.seen_at ? (
                        <CheckCheck className="w-3 h-3 text-blue-200" />
                      ) : message.is_read ? (
                        <Check className="w-3 h-3 text-blue-200" />
                      ) : (
                        <Check className="w-3 h-3 text-blue-200 opacity-50" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}

      {isTyping && typingUser && (
        <div className="flex justify-start">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-900 mr-12 px-4 py-3 rounded-3xl shadow-lg border border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-sm text-gray-600 font-medium">Admin is typing...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
