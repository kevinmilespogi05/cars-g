import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '../../types/chat';
import { chatService } from '../../services/chatService';
import { realTimeChatService } from '../../services/realTimeChatService';
import { useAuthStore } from '../../store/authStore';
import { MoreVertical, Bell, BellOff, UserX, Trash, X, Send, Image, Smile, Check, CheckCheck, ThumbsUp, Heart, Laugh, Frown, Angry, MessageSquare, Wifi, WifiOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ChatServiceError } from '../../services/chatService';
import { supabase } from '../../lib/supabase';

interface ChatRoomProps {
  roomId: string;
  roomName: string;
  onDelete?: () => void;
}

interface MessageReaction {
  reaction: string;
  count: number;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({ roomId, roomName, onDelete }) => {
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
  const menuRef = useRef<HTMLDivElement>(null);
  const reactionMenuRef = useRef<HTMLDivElement>(null);

  // Real-time subscription cleanup functions
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

        // Subscribe to real-time updates
        await setupRealTimeSubscriptions();
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize chat');
      } finally {
        setIsLoading(false);
      }
    };

    initializeChat();

    // Cleanup function
    return () => {
      // Unsubscribe from all real-time events
      unsubscribeRefs.current.forEach(unsubscribe => unsubscribe());
      unsubscribeRefs.current = [];
      
      // Unsubscribe from room
      realTimeChatService.unsubscribeFromRoom(roomId);
    };
  }, [roomId]);

  const setupRealTimeSubscriptions = async () => {
    try {
      // Subscribe to the room
      await realTimeChatService.subscribeToRoom(roomId);

      // Subscribe to messages
      const messageUnsubscribe = realTimeChatService.onMessage(roomId, (message) => {
        setMessages(prev => {
          // Check if message already exists
          if (prev.some(m => m.id === message.id)) {
            return prev;
          }
          return [...prev, message];
        });
      });

      // Subscribe to typing indicators
      const typingUnsubscribe = realTimeChatService.onTyping(roomId, (userId, isTyping) => {
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

      // Subscribe to reactions
      const reactionUnsubscribe = realTimeChatService.onReaction(roomId, (messageId, reaction, count) => {
        setMessageReactions(prev => {
          const currentReactions = prev[messageId] || [];
          
          if (count <= 0) {
            // Remove the reaction if count is 0
            return {
              ...prev,
              [messageId]: currentReactions.filter(r => r.reaction !== reaction)
            };
          } else {
            // Update or add the reaction
            const existingReaction = currentReactions.find(r => r.reaction === reaction);
            if (existingReaction) {
              return {
                ...prev,
                [messageId]: currentReactions.map(r => 
                  r.reaction === reaction ? { reaction, count } : r
                )
              };
            } else {
              return {
                ...prev,
                [messageId]: [...currentReactions, { reaction, count }]
              };
            }
          }
        });
      });

      // Subscribe to presence
      const presenceUnsubscribe = realTimeChatService.onPresence(roomId, (userId, status) => {
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

      // Monitor connection status
      const checkConnectionStatus = () => {
        setConnectionStatus(realTimeChatService.getConnectionStatus());
      };
      
      // Check immediately and set up interval
      checkConnectionStatus();
      const connectionInterval = setInterval(checkConnectionStatus, 5000);

      // Store cleanup functions
      unsubscribeRefs.current = [
        messageUnsubscribe,
        typingUnsubscribe,
        reactionUnsubscribe,
        presenceUnsubscribe,
        () => clearInterval(connectionInterval)
      ];

      setIsSubscribed(true);

    } catch (error) {
      console.error('Failed to setup real-time subscriptions:', error);
      setError('Failed to connect to real-time chat');
    }
  };

  const loadMessages = async () => {
    try {
      const loadedMessages = await chatService.getMessages(roomId);
      return loadedMessages;
    } catch (err) {
      const errorMessage = err instanceof ChatServiceError 
        ? err.message 
        : 'Failed to load messages';
      setError(errorMessage);
      throw err;
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) {
      console.log('Message send blocked:', { 
        messageEmpty: !newMessage.trim(), 
        userMissing: !user,
        connectionStatus 
      });
      return;
    }

    const messageContent = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX

    console.log('Sending message:', {
      roomId,
      content: messageContent,
      userId: user.id,
      connectionStatus
    });

    try {
      // Create optimistic message for immediate display
      const optimisticMessage: ChatMessage = {
        id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        room_id: roomId,
        content: messageContent,
        sender_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        profiles: {
          username: user.username || user.email?.split('@')[0] || 'User',
          avatar_url: user.avatar_url || null
        }
      };

      // Add optimistic message immediately
      setMessages(prev => [...prev, optimisticMessage]);
      
      // Scroll to bottom immediately
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

      // Send message asynchronously (don't wait for response)
      console.log('Calling sendMessageFast...');
      await chatService.sendMessageFast(roomId, messageContent);
      console.log('Message sent successfully');
      
    } catch (err) {
      console.error('Error sending message:', err);
      const errorMessage = err instanceof ChatServiceError 
        ? err.message 
        : 'Failed to send message';
      setError(errorMessage);
      
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`));
    }
  };

  // Debug function to test message sending
  const handleTestMessage = async () => {
    try {
      console.log('🧪 Testing message sending...');
      await chatService.testMessageSending(roomId);
      console.log('✅ Test completed successfully');
    } catch (error) {
      console.error('❌ Test failed:', error);
      setError(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const success = await chatService.deleteMessage(messageId);
      if (success) {
        setMessages(messages.filter(msg => msg.id !== messageId));
        console.log('Message deleted successfully');
      }
    } catch (err) {
      const errorMessage = err instanceof ChatServiceError 
        ? err.message 
        : 'Failed to delete message';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setActionMenuOpen(null);
    }
  };

  const handleBlockUser = async (userId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await chatService.blockUser(userId);
      setBlockedUsers([...blockedUsers, userId]);
      setMessages(messages.filter(msg => msg.sender_id !== userId));
      console.log('User blocked successfully');
    } catch (err) {
      const errorMessage = err instanceof ChatServiceError 
        ? err.message 
        : 'Failed to block user';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setActionMenuOpen(null);
    }
  };

  const handleMuteRoom = async () => {
    try {
      setIsLoading(true);
      setError(null);
      if (isMuted) {
        await chatService.unmuteRoom(roomId);
        setIsMuted(false);
        console.log('Room unmuted successfully');
      } else {
        await chatService.muteRoom(roomId);
        setIsMuted(true);
        console.log('Room muted successfully');
      }
    } catch (err) {
      const errorMessage = err instanceof ChatServiceError 
        ? err.message 
        : 'Failed to change room mute status';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setRoomMenuOpen(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!window.confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);
      const success = await chatService.deleteRoom(roomId);
      if (success) {
        console.log('Chat room deleted successfully');
        onDelete?.();
      }
    } catch (err) {
      const errorMessage = err instanceof ChatServiceError 
        ? err.message 
        : 'Failed to delete chat room';
      setError(errorMessage);
    } finally {
      setIsDeleting(false);
      setRoomMenuOpen(false);
    }
  };

  const handleTyping = () => {
    if (!user) return;
    
    realTimeChatService.sendTypingIndicator(roomId);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      realTimeChatService.sendTypingIndicator(roomId, false);
    }, 3000);
  };

  const handleAddReaction = async (messageId: string, reaction: string) => {
    try {
      // Check if user already has a reaction on this message
      const currentReactions = messageReactions[messageId] || [];
      const userReaction = currentReactions.find(r => r.reaction === reaction);
      
      if (userReaction) {
        // If user already has this reaction, remove it
        await handleRemoveReaction(messageId, reaction);
        return;
      }

      // Remove any existing reaction from the user
      const otherReactions = currentReactions.filter(r => r.reaction !== reaction);
      
      // Optimistically update the UI
      setMessageReactions(prev => ({
        ...prev,
        [messageId]: [...otherReactions, { reaction, count: 1 }]
      }));

      // Close the reaction menu
      setReactionMenuOpen(null);

      // Send the reaction to the server
      await chatService.addReaction(messageId, reaction);
    } catch (err) {
      console.error('Failed to add reaction:', err);
      // Revert the optimistic update if the server request fails
      setMessageReactions(prev => {
        const currentReactions = prev[messageId] || [];
        return {
          ...prev,
          [messageId]: currentReactions.filter(r => r.reaction !== reaction)
        };
      });
    }
  };

  const handleRemoveReaction = async (messageId: string, reaction: string) => {
    try {
      // Optimistically update the UI
      setMessageReactions(prev => {
        const currentReactions = prev[messageId] || [];
        return {
          ...prev,
          [messageId]: currentReactions.filter(r => r.reaction !== reaction)
        };
      });

      // Send the removal to the server
      await chatService.removeReaction(messageId, reaction);
    } catch (err) {
      console.error('Failed to remove reaction:', err);
      // Revert the optimistic update if the server request fails
      setMessageReactions(prev => {
        const currentReactions = prev[messageId] || [];
        return {
          ...prev,
          [messageId]: [...currentReactions, { reaction, count: 1 }]
        };
      });
    }
  };

  const handleQuickReply = async (messageId: string, reply: string) => {
    try {
      await chatService.sendMessage(roomId, reply);
      setSelectedMessage(null);
    } catch (err) {
      console.error('Failed to send quick reply:', err);
    }
  };

  // Add click outside handler for both menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setSelectedMessage(null);
      }
      if (reactionMenuRef.current && !reactionMenuRef.current.contains(event.target as Node)) {
        setReactionMenuOpen(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-color"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="text-danger mb-4">{error}</div>
        <button 
          onClick={() => setError(null)}
          className="btn btn-primary"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Connection Status Indicator */}
      {connectionStatus !== 'connected' && (
        <div className="flex-none px-4 py-2 bg-yellow-50 border-b border-yellow-200">
          <div className="flex items-center space-x-2 text-yellow-800">
            {connectionStatus === 'connecting' ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                <span className="text-sm">Connecting...</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4" />
                <span className="text-sm">Connection lost. Reconnecting...</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-6 chat-messages-container">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No messages yet</h3>
            <p className="text-gray-500 max-w-md">
              Start the conversation by sending your first message
            </p>
          </div>
        ) : (
          messages.map((message) => (
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
                    {/* Online indicator */}
                    {message.sender_id !== user?.id && onlineUsers.has(message.sender_id) && (
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    )}
                    {/* Message status for own messages */}
                    {message.sender_id === user?.id && (
                      <span className="flex items-center">
                        {message.status === 'delivered' ? (
                          <CheckCheck className="w-3 h-3 text-blue-400" />
                        ) : (
                          <Check className="w-3 h-3 text-blue-400" />
                        )}
                      </span>
                    )}
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
                    {(messageReactions[message.id] || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {messageReactions[message.id].map((reaction, index) => {
                          const isUserReaction = message.sender_id === user?.id;
                          return (
                            <button
                              key={index}
                              onClick={() => isUserReaction && handleRemoveReaction(message.id, reaction.reaction)}
                              className={`px-2 py-1 rounded-full text-xs border chat-reaction transition-colors ${
                                message.sender_id === user?.id 
                                  ? 'bg-blue-400/20 text-blue-100 border-blue-300/30 hover:bg-blue-400/30' 
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                              }`}
                            >
                              {reaction.reaction} {reaction.count}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  {/* Message Actions */}
                  <div className={`flex items-center mt-2 space-x-1 ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                    <button
                      onClick={() => setReactionMenuOpen(reactionMenuOpen === message.id ? null : message.id)}
                      className={`p-2 rounded-full transition-colors chat-reaction ${
                        message.sender_id === user?.id 
                          ? 'hover:bg-blue-400/20 text-blue-300 hover:text-blue-200' 
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600'
                      }`}
                      aria-label="Add reaction"
                    >
                      <Smile className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSelectedMessage(selectedMessage === message.id ? null : message.id)}
                      className={`p-2 rounded-full transition-colors chat-reaction ${
                        message.sender_id === user?.id 
                          ? 'hover:bg-blue-400/20 text-blue-300 hover:text-blue-200' 
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600'
                      }`}
                      aria-label="Message options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        
        {/* Typing Indicators */}
        {typingUsers.size > 0 && (
          <div className="flex items-center space-x-3 text-sm text-gray-500 px-4">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-gray-500">
              {typingUsers.size === 1 ? 'Someone is typing...' : `${typingUsers.size} people are typing...`}
            </span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="flex-none p-4 sm:p-6 bg-white border-t border-gray-100">
        {/* Debug button - remove this after testing */}
        <div className="mb-2">
          <button
            type="button"
            onClick={handleTestMessage}
            className="px-3 py-1 text-xs bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
          >
            🧪 Test Message Sending
          </button>
        </div>
        
        <form onSubmit={handleSendMessage} className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              placeholder="Type a message..."
              className="w-full px-4 py-3 pr-12 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-color focus:border-transparent bg-gray-50 focus:bg-white transition-colors resize-none"
              rows={1}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Open emoji picker"
              >
                <Smile className="w-4 h-4 text-gray-400" />
              </button>
              <button
                type="button"
                className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Upload image"
              >
                <Image className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim() || isLoading || connectionStatus !== 'connected'}
            className="p-3 rounded-full bg-primary-color text-white hover:bg-primary-dark transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            aria-label="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* Reaction Menu */}
      {reactionMenuOpen && (
        <div 
          ref={reactionMenuRef}
          className="fixed bottom-24 right-4 bg-white rounded-xl shadow-lg border border-gray-200 p-3 flex space-x-2 z-50"
        >
          <button onClick={() => handleAddReaction(reactionMenuOpen, '👍')} className="p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="React with thumbs up">
            <ThumbsUp className="w-5 h-5" />
          </button>
          <button onClick={() => handleAddReaction(reactionMenuOpen, '❤️')} className="p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="React with heart">
            <Heart className="w-5 h-5" />
          </button>
          <button onClick={() => handleAddReaction(reactionMenuOpen, '😂')} className="p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="React with laugh">
            <Laugh className="w-5 h-5" />
          </button>
          <button onClick={() => handleAddReaction(reactionMenuOpen, '😢')} className="p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="React with sad face">
            <Frown className="w-5 h-5" />
          </button>
          <button onClick={() => handleAddReaction(reactionMenuOpen, '😠')} className="p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="React with angry face">
            <Angry className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Quick Reply Menu */}
      {selectedMessage && (
        <div 
          ref={menuRef}
          className="fixed bottom-24 right-4 bg-white rounded-xl shadow-lg border border-gray-200 p-3 z-50"
        >
          <div className="space-y-2">
            <button onClick={() => handleQuickReply(selectedMessage, 'Yes, I agree!')} className="w-full px-4 py-2 text-left hover:bg-gray-100 rounded-lg transition-colors text-sm">
              Yes, I agree!
            </button>
            <button onClick={() => handleQuickReply(selectedMessage, 'No, I disagree.')} className="w-full px-4 py-2 text-left hover:bg-gray-100 rounded-lg transition-colors text-sm">
              No, I disagree.
            </button>
            <button onClick={() => handleQuickReply(selectedMessage, 'Let me think about it.')} className="w-full px-4 py-2 text-left hover:bg-gray-100 rounded-lg transition-colors text-sm">
              Let me think about it.
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-lg z-50 max-w-sm">
          <div className="flex items-center space-x-2">
            <X className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}
    </div>
  );
}; 