import React, { useState } from 'react';
import { ChatMessage } from '../types';
import { format, formatDistanceToNow } from 'date-fns';
import { MessageCircle, Check, CheckCheck, Copy, MoreVertical } from 'lucide-react';

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
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const formatMessageTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
      
      // If less than 24 hours, show relative time
      if (diffInHours < 24) {
        return formatDistanceToNow(date, { addSuffix: true });
      }
      // Otherwise show formatted date and time
      return format(date, 'MMM d, h:mm a');
    } catch {
      return 'Just now';
    }
  };

  const getMessageAlignment = (message: ChatMessage) => {
    return message.sender_id === currentUserId ? 'right' : 'left';
  };

  const getUserAvatar = (message: ChatMessage) => {
    const isOwn = message.sender_id === currentUserId;
    // Always use the sender for the avatar - they're the one who sent this message
    const user = message.sender;
    
    if (user?.avatar_url) {
      return user.avatar_url;
    }
    
    const username = user?.username || (isOwn ? 'You' : 'User');
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random&size=128`;
  };

  const getUserName = (message: ChatMessage) => {
    const isOwn = message.sender_id === currentUserId;
    // Always use the sender for the name - they're the one who sent this message
    const user = message.sender;
    return user?.username || (isOwn ? 'You' : 'User');
  };

  const handleCopyMessage = async (messageText: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  return (
    <div className="flex-1 p-4 space-y-4">
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
          const isOwn = message.sender_id === currentUserId;
          const showAvatar = index === 0 || messages[index - 1].sender_id !== message.sender_id;
          const showName = showAvatar;
          const avatar = getUserAvatar(message);
          const userName = getUserName(message);

          return (
            <div
              key={message.id}
              className={`flex ${alignment === 'right' ? 'justify-end' : 'justify-start'} group`}
              onMouseEnter={() => setHoveredMessageId(message.id)}
              onMouseLeave={() => setHoveredMessageId(null)}
            >
              {/* Avatar for received messages (left side) */}
              {!isOwn && (
                <div className={`flex-shrink-0 mr-2 ${showAvatar ? '' : 'invisible'}`}>
                  <img
                    src={avatar}
                    alt={userName}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow-sm"
                  />
                </div>
              )}

              {/* Message content */}
              <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[75%]`}>
                {/* Username */}
                {showName && (
                  <div className={`px-3 mb-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                    <span className="text-xs font-semibold text-gray-600">
                      {userName}
                    </span>
                  </div>
                )}

                {/* Message bubble */}
                <div className="relative group/message">
                  <div
                    className={`
                      px-4 py-2.5 rounded-2xl shadow-sm transition-all duration-200
                      ${isOwn 
                        ? 'bg-blue-500 text-white rounded-br-md hover:shadow-md' 
                        : 'bg-white text-gray-900 border border-gray-200 rounded-bl-md hover:shadow-md'
                      }
                    `}
                  >
                    {/* Message text */}
                    <p className={`text-sm break-words leading-relaxed whitespace-pre-wrap ${
                      isOwn ? 'text-white' : 'text-gray-800'
                    }`}>
                      {message.message}
                    </p>

                    {/* Timestamp and status */}
                    <div className={`flex items-center justify-end gap-1 mt-1.5 ${
                      isOwn ? 'text-blue-100' : 'text-gray-400'
                    }`}>
                      <span className="text-[10px] font-medium leading-none">
                        {formatMessageTime(message.created_at)}
                      </span>
                      {isOwn && (
                        <div className="flex items-center">
                          {message.seen_at ? (
                            <CheckCheck className="w-3.5 h-3.5 text-blue-200" />
                          ) : message.is_read ? (
                            <CheckCheck className="w-3.5 h-3.5 text-blue-300" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-blue-300 opacity-60" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Copy button - shows on hover */}
                  {hoveredMessageId === message.id && (
                    <button
                      onClick={() => handleCopyMessage(message.message, message.id)}
                      className={`
                        absolute -top-2 ${isOwn ? '-left-8' : '-right-8'}
                        p-1.5 bg-white border border-gray-200 rounded-lg shadow-md
                        hover:bg-gray-50 transition-all duration-200
                        opacity-0 group-hover/message:opacity-100
                      `}
                      title="Copy message"
                    >
                      {copiedMessageId === message.id ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-gray-500" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Avatar for sent messages (right side) */}
              {isOwn && (
                <div className={`flex-shrink-0 ml-2 ${showAvatar ? '' : 'invisible'}`}>
                  <img
                    src={avatar}
                    alt={userName}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-100 shadow-sm"
                  />
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Typing indicator */}
      {isTyping && typingUser && (
        <div className="flex justify-start items-end group">
          <div className="flex-shrink-0 mr-2">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <MoreVertical className="w-4 h-4 text-gray-500 animate-pulse" />
            </div>
          </div>
          <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs text-gray-500 font-medium">Admin is typing</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
