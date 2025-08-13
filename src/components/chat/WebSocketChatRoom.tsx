import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '../../types/chat';
import { chatService } from '../../services/chatService';
import { websocketChatService } from '../../services/websocketChatService';
import { useAuthStore } from '../../store/authStore';
import { 
  MoreVertical, 
  Bell, 
  BellOff, 
  UserX, 
  Trash, 
  X, 
  Send, 
  Image, 
  Smile, 
  Check, 
  CheckCheck, 
  ThumbsUp, 
  Heart, 
  Laugh, 
  Frown, 
  Angry, 
  MessageSquare, 
  Wifi, 
  WifiOff,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ChatServiceError } from '../../services/chatService';
import { supabase } from '../../lib/supabase';

interface WebSocketChatRoomProps {
  roomId: string;
  roomName: string;
  onDelete?: () => void;
}

interface MessageReaction {
  reaction: string;
  count: number;
}

export const WebSocketChatRoom: React.FC<WebSocketChatRoomProps> = ({ roomId, roomName, onDelete }) => {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [roomMenuOpen, setRoomMenuOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [reactionMenuOpen, setReactionMenuOpen] = useState<string | null>(null);
  const [messageReactions, setMessageReactions] = useState<Record<string, MessageReaction[]>>({});
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [showConnectionError, setShowConnectionError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const reactionMenuRef = useRef<HTMLDivElement>(null);

  // WebSocket subscription cleanup functions
  const unsubscribeRefs = useRef<Array<() => void>>([]);

  useEffect(() => {
    const initializeChat = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Load initial data
        const [loadedMessages, mutedRooms, blockedUsers] = await Promise.all([
          loadMessages(),
          chatService.getMutedRooms(),
          chatService.getBlockedUsers()
        ]);
        
        // Load reactions for all messages
        const reactionsMap: Record<string, MessageReaction[]> = {};
        for (const message of loadedMessages) {
          const reactions = await chatService.getMessageReactions(message.id);
          reactionsMap[message.id] = reactions;
        }
        setMessageReactions(reactionsMap);
        
        setMessages(loadedMessages);
        setIsMuted(mutedRooms.includes(roomId));
        setBlockedUsers(blockedUsers);

        // Setup WebSocket subscriptions
        await setupWebSocketSubscriptions();
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize chat');
      } finally {
        setIsLoading(false);
      }
    };

    initializeChat();

    // Cleanup function
    return () => {
      // Unsubscribe from all WebSocket events
      unsubscribeRefs.current.forEach(unsubscribe => unsubscribe());
      unsubscribeRefs.current = [];
      
      // Unsubscribe from room
      websocketChatService.unsubscribeFromRoom(roomId);
    };
  }, [roomId]);

  const setupWebSocketSubscriptions = async () => {
    try {
      // Subscribe to the room
      await websocketChatService.subscribeToRoom(roomId);
      setIsSubscribed(true);

      // Setup event listeners
      const unsubscribeMessage = websocketChatService.onMessage(roomId, (message) => {
        setMessages(prev => {
          // Check if message already exists
          const exists = prev.some(m => m.id === message.id);
          if (exists) return prev;
          
          return [...prev, message];
        });
        scrollToBottom();
      });

      const unsubscribeTyping = websocketChatService.onTyping(roomId, (userId, isTyping) => {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          if (isTyping) {
            newSet.add(userId);
          } else {
            newSet.delete(userId);
          }
          return newSet;
        });
      });

      const unsubscribeReaction = websocketChatService.onReaction(roomId, (messageId, reaction, count) => {
        setMessageReactions(prev => {
          const currentReactions = prev[messageId] || [];
          const existingIndex = currentReactions.findIndex(r => r.reaction === reaction);
          
          if (existingIndex >= 0) {
            if (count <= 0) {
              // Remove reaction if count is 0 or negative
              const newReactions = currentReactions.filter(r => r.reaction !== reaction);
              return { ...prev, [messageId]: newReactions };
            } else {
              // Update count
              const newReactions = [...currentReactions];
              newReactions[existingIndex] = { reaction, count };
              return { ...prev, [messageId]: newReactions };
            }
          } else if (count > 0) {
            // Add new reaction
            return { ...prev, [messageId]: [...currentReactions, { reaction, count }] };
          }
          
          return prev;
        });
      });

      const unsubscribePresence = websocketChatService.onPresence(roomId, (userId, status) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          if (status === 'online') {
            newSet.add(userId);
          } else {
            newSet.delete(userId);
          }
          return newSet;
        });
      });

      const unsubscribeConnection = websocketChatService.onConnectionStatus((status) => {
        setConnectionStatus(status as 'connected' | 'connecting' | 'disconnected');
        setShowConnectionError(status === 'disconnected');
      });

      const unsubscribeError = websocketChatService.onError((error) => {
        setError(error);
        setShowConnectionError(true);
      });

      // Store cleanup functions
      unsubscribeRefs.current = [
        unsubscribeMessage,
        unsubscribeTyping,
        unsubscribeReaction,
        unsubscribePresence,
        unsubscribeConnection,
        unsubscribeError
      ];

    } catch (error) {
      console.error('Failed to setup WebSocket subscriptions:', error);
      setError('Failed to connect to real-time chat');
    }
  };

  const loadMessages = async (): Promise<ChatMessage[]> => {
    try {
      const messages = await chatService.getMessages(roomId);
      return messages;
    } catch (error) {
      console.error('Failed to load messages:', error);
      throw error;
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      // Send message via WebSocket
      await websocketChatService.sendMessage(roomId, messageContent);
      
      // Clear typing indicator
      await websocketChatService.sendTypingIndicator(roomId, false);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to send message');
      // Restore message content
      setNewMessage(messageContent);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    // Send typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    websocketChatService.sendTypingIndicator(roomId, true);
    
    typingTimeoutRef.current = setTimeout(() => {
      websocketChatService.sendTypingIndicator(roomId, false);
    }, 3000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReaction = async (messageId: string, reaction: string) => {
    try {
      await websocketChatService.sendReaction(messageId, roomId, reaction);
      setReactionMenuOpen(null);
    } catch (error) {
      console.error('Failed to send reaction:', error);
      setError('Failed to send reaction');
    }
  };

  const toggleMute = async () => {
    try {
      if (isMuted) {
        await chatService.unmuteRoom(roomId);
        setIsMuted(false);
      } else {
        await chatService.muteRoom(roomId);
        setIsMuted(true);
      }
    } catch (error) {
      console.error('Failed to toggle mute:', error);
      setError('Failed to update mute status');
    }
  };

  const handleDeleteRoom = async () => {
    if (!onDelete) return;
    
    setIsDeleting(true);
    try {
      await chatService.deleteRoom(roomId);
      onDelete();
    } catch (error) {
      console.error('Failed to delete room:', error);
      setError('Failed to delete room');
    } finally {
      setIsDeleting(false);
    }
  };

  const getTypingText = () => {
    const typingArray = Array.from(typingUsers);
    if (typingArray.length === 0) return null;
    if (typingArray.length === 1) return `${typingArray[0]} is typing...`;
    if (typingArray.length === 2) return `${typingArray[0]} and ${typingArray[1]} are typing...`;
    return 'Several people are typing...';
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

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-slate-400 dark:text-slate-500 text-xs">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse loading-dot"></div>
            <span>Connecting to chat server</span>
          </div>
          <div className="flex items-center space-x-2 text-slate-400 dark:text-slate-500 text-xs">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse loading-dot" style={{ animationDelay: '0.2s' }}></div>
            <span>Loading message history</span>
          </div>
          <div className="flex items-center space-x-2 text-slate-400 dark:text-slate-500 text-xs">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse loading-dot" style={{ animationDelay: '0.4s' }}></div>
            <span>Setting up real-time updates</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {getConnectionStatusIcon()}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {roomName}
            </h2>
          </div>
          {onlineUsers.size > 0 && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {onlineUsers.size} online
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Enhanced Connection Error Banner */}
          {showConnectionError && (
            <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-b border-red-200 dark:border-red-800 px-4 py-4 connection-error-banner">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 text-red-600 dark:text-red-400">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">Connection lost</p>
                    <p className="text-xs text-red-500 dark:text-red-400">Trying to reconnect automatically...</p>
                  </div>
                </div>
                <button
                  onClick={() => websocketChatService.connect()}
                  className="px-4 py-2 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 rounded-lg text-sm font-medium hover:bg-red-200 dark:hover:bg-red-700 transition-colors duration-200 flex items-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Retry</span>
                </button>
              </div>
            </div>
          )}
          
          <button
            onClick={toggleMute}
            className={`p-2 rounded-lg transition-colors ${
              isMuted 
                ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400' 
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
            }`}
          >
            {isMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
          </button>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setRoomMenuOpen(!roomMenuOpen)}
              className="p-2 rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {roomMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                <button
                  onClick={handleDeleteRoom}
                  disabled={isDeleting}
                  className="w-full px-4 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
                >
                  <Trash className="w-4 h-4" />
                  <span>{isDeleting ? 'Deleting...' : 'Delete Room'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 chat-messages-container">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'} chat-message-enter chat-message`}
          >
            <div className={`flex items-end space-x-3 max-w-xs lg:max-w-md ${message.sender_id === user?.id ? 'flex-row-reverse space-x-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium shadow-md chat-avatar ${
                message.sender_id === user?.id 
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                  : 'bg-gradient-to-br from-purple-500 to-purple-600'
              }`}>
                {message.profiles?.avatar_url ? (
                  <img 
                    src={message.profiles.avatar_url} 
                    alt={message.profiles.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-xs">
                    {message.profiles?.username?.charAt(0).toUpperCase() || 'U'}
                  </span>
                )}
              </div>

              {/* Message Content */}
              <div className={`flex flex-col ${message.sender_id === user?.id ? 'items-end' : 'items-start'}`}>
                {/* Username and timestamp */}
                <div className={`flex items-center space-x-2 mb-1 ${message.sender_id === user?.id ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {message.sender_id === user?.id ? 'You' : message.profiles?.username || 'Unknown User'}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 chat-timestamp">
                    {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                  </span>
                </div>
                
                {/* Message bubble */}
                <div
                  className={`px-4 py-3 rounded-2xl shadow-sm transition-all duration-200 chat-message-bubble ${
                    message.sender_id === user?.id
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-md own'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-bl-md other'
                  }`}
                >
                  <p className="text-sm leading-relaxed break-words">{message.content}</p>
                  
                  {/* Message reactions */}
                  {messageReactions[message.id] && messageReactions[message.id].length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {messageReactions[message.id].map((reaction, index) => (
                        <span
                          key={index}
                          className={`px-2 py-1 rounded-full text-xs border chat-reaction ${
                            message.sender_id === user?.id
                              ? 'bg-blue-400/20 text-blue-100 border-blue-300/30'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                          }`}
                        >
                          {reaction.reaction} {reaction.count}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Enhanced Typing Indicator */}
        {getTypingText() && (
          <div className="flex justify-start">
            <div className="flex items-center space-x-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm px-5 py-3 rounded-2xl border border-white/20 dark:border-slate-700/50 shadow-lg chat-typing-indicator">
              <div className="flex space-x-1">
                <div className="w-2.5 h-2.5 bg-slate-400 rounded-full loading-dot"></div>
                <div className="w-2.5 h-2.5 bg-slate-400 rounded-full loading-dot" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2.5 h-2.5 bg-slate-400 rounded-full loading-dot" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                  {getTypingText()}
                </p>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-center space-x-3">
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-200 shadow-sm chat-input"
            disabled={connectionStatus === 'disconnected'}
          />
          
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-200"
          >
            <Smile className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || connectionStatus === 'disconnected'}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}; 