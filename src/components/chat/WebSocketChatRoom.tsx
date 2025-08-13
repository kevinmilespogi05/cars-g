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
  AlertCircle
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
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
          {showConnectionError && (
            <div className="flex items-center space-x-1 text-red-500 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Connection lost</span>
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.sender_id === user?.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
              }`}
            >
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-sm font-medium">
                  {message.profiles?.username || 'Unknown User'}
                </span>
                <span className="text-xs opacity-70">
                  {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                </span>
              </div>
              
              <p className="text-sm">{message.content}</p>
              
              {messageReactions[message.id] && messageReactions[message.id].length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {messageReactions[message.id].map((reaction, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-white dark:bg-gray-700 rounded-full text-xs border"
                    >
                      {reaction.reaction} {reaction.count}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {getTypingText() && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                {getTypingText()}
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            disabled={connectionStatus === 'disconnected'}
          />
          
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <Smile className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || connectionStatus === 'disconnected'}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}; 