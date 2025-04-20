import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '../../types/chat';
import { chatService } from '../../services/chatService';
import { useAuthStore } from '../../store/authStore';
import { MoreVertical, Bell, BellOff, UserX, Trash, X, Send, Image, Smile, Check, CheckCheck, ThumbsUp, Heart, Laugh, Frown, Angry } from 'lucide-react';
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
  const subscriptionRef = useRef<(() => void) | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [reactionMenuOpen, setReactionMenuOpen] = useState<string | null>(null);
  const [messageReactions, setMessageReactions] = useState<Record<string, MessageReaction[]>>({});

  useEffect(() => {
    const initializeChat = async () => {
      try {
        setIsLoading(true);
        setError(null);
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
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize chat');
      } finally {
        setIsLoading(false);
      }
    };

    initializeChat();

    // Subscribe to new messages
    const messageSubscription = chatService.subscribeToMessages(roomId, (message) => {
      setMessages(prev => {
        // Check if message already exists
        if (prev.some(m => m.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
    });

    // Subscribe to typing indicators
    const typingSubscription = chatService.subscribeToTypingIndicators(roomId, (userId, isTyping) => {
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

    // Subscribe to reaction updates
    const reactionSubscription = chatService.subscribeToReactions(roomId, (messageId, reaction, count) => {
      setMessageReactions(prev => {
        const currentReactions = prev[messageId] || [];
        const updatedReactions = [...currentReactions];
        const existingReaction = updatedReactions.find(r => r.reaction === reaction);
        
        if (existingReaction) {
          existingReaction.count = count;
          if (existingReaction.count <= 0) {
            updatedReactions.splice(updatedReactions.indexOf(existingReaction), 1);
          }
        } else if (count > 0) {
          updatedReactions.push({ reaction, count });
        }
        
        return {
          ...prev,
          [messageId]: updatedReactions
        };
      });
    });

    setIsSubscribed(true);

    return () => {
      messageSubscription();
      typingSubscription();
      reactionSubscription();
      setIsSubscribed(false);
    };
  }, [roomId]);

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
    if (!newMessage.trim() || !user) return;

    try {
      setIsLoading(true);
      setError(null);
      const sentMessage = await chatService.sendMessage(roomId, newMessage);
      console.log('Message sent:', sentMessage);
      setNewMessage('');
    } catch (err) {
      const errorMessage = err instanceof ChatServiceError 
        ? err.message 
        : 'Failed to send message';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
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
    
    chatService.sendTypingIndicator(roomId, user.id);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      chatService.sendTypingIndicator(roomId, user.id, false);
    }, 3000);
  };

  const handleAddReaction = async (messageId: string, reaction: string) => {
    try {
      await chatService.addReaction(messageId, reaction);
      setReactionMenuOpen(null);
    } catch (err) {
      console.error('Failed to add reaction:', err);
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

  const handleRemoveReaction = async (messageId: string, reaction: string) => {
    try {
      await chatService.removeReaction(messageId, reaction);
    } catch (err) {
      console.error('Failed to remove reaction:', err);
    }
  };

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
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex-none p-4 border-b border-gray-200 bg-gradient-to-r from-primary-color to-primary-dark">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
              <span className="text-primary-color font-bold text-lg">
                {roomName?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{roomName}</h2>
              <p className="text-sm text-white/80">
                {messages.length} {messages.length === 1 ? 'message' : 'messages'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              title={isMuted ? "Unmute notifications" : "Mute notifications"}
            >
              {isMuted ? (
                <BellOff className="w-5 h-5 text-white" />
              ) : (
                <Bell className="w-5 h-5 text-white" />
              )}
            </button>
            <button
              onClick={() => setRoomMenuOpen(!roomMenuOpen)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <MoreVertical className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.sender_id === user?.id
                  ? 'bg-primary-color text-white rounded-br-none'
                  : 'bg-white text-gray-900 rounded-bl-none shadow-sm'
              }`}
            >
              <div className="flex items-center space-x-2 mb-1">
                <span className="font-medium">
                  {message.sender_id === user?.id ? 'You' : message.profiles?.username}
                </span>
                <span className="text-xs opacity-70">
                  {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                </span>
                {message.sender_id === user?.id && (
                  <span className="ml-1">
                    {message.status === 'delivered' ? (
                      <CheckCheck className="w-3 h-3" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                  </span>
                )}
              </div>
              <p className="text-sm">{message.content}</p>
              
              {/* Message Reactions */}
              {(messageReactions[message.id] || []).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {messageReactions[message.id].map((reaction, index) => {
                    const isUserReaction = message.sender_id === user?.id;
                    return (
                      <button
                        key={index}
                        onClick={() => isUserReaction && handleRemoveReaction(message.id, reaction.reaction)}
                        className={`text-xs px-2 py-1 rounded-full ${
                          message.sender_id === user?.id
                            ? 'bg-white/20 hover:bg-white/30 cursor-pointer'
                            : 'bg-gray-100'
                        }`}
                      >
                        {reaction.reaction} {reaction.count}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Message Actions */}
              <div className="flex items-center justify-end mt-2 space-x-2">
                <button
                  onClick={() => setReactionMenuOpen(message.id)}
                  className="p-1 rounded-full hover:bg-white/10 transition-colors"
                >
                  <Smile className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedMessage(message.id)}
                  className="p-1 rounded-full hover:bg-white/10 transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {/* Typing Indicators */}
        {typingUsers.size > 0 && (
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>
              {typingUsers.size === 1
                ? 'Someone is typing...'
                : `${typingUsers.size} people are typing...`}
            </span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Reaction Menu */}
      {reactionMenuOpen && (
        <div className="absolute bottom-20 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-2 flex space-x-2">
          <button
            onClick={() => handleAddReaction(reactionMenuOpen, '👍')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ThumbsUp className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleAddReaction(reactionMenuOpen, '❤️')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Heart className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleAddReaction(reactionMenuOpen, '😂')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Laugh className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleAddReaction(reactionMenuOpen, '😢')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Frown className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleAddReaction(reactionMenuOpen, '😠')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Angry className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Quick Reply Menu */}
      {selectedMessage && (
        <div className="absolute bottom-20 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-2">
          <div className="space-y-2">
            <button
              onClick={() => handleQuickReply(selectedMessage, 'Yes, I agree!')}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 rounded-lg transition-colors"
            >
              Yes, I agree!
            </button>
            <button
              onClick={() => handleQuickReply(selectedMessage, 'No, I disagree.')}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 rounded-lg transition-colors"
            >
              No, I disagree.
            </button>
            <button
              onClick={() => handleQuickReply(selectedMessage, 'Let me think about it.')}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 rounded-lg transition-colors"
            >
              Let me think about it.
            </button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="flex-none p-4 border-t border-gray-200 bg-white">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <Smile className="w-5 h-5 text-gray-500" />
          </button>
          <button
            type="button"
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <Image className="w-5 h-5 text-gray-500" />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-color focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isLoading}
            className="p-2 rounded-full bg-primary-color text-white hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* Room Menu */}
      {roomMenuOpen && (
        <div className="absolute top-16 right-4 bg-white rounded-lg shadow-lg border border-gray-200 w-48">
          <button
            onClick={handleMuteRoom}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-2"
          >
            {isMuted ? (
              <>
                <Bell className="w-4 h-4" />
                <span>Unmute Notifications</span>
              </>
            ) : (
              <>
                <BellOff className="w-4 h-4" />
                <span>Mute Notifications</span>
              </>
            )}
          </button>
          {onDelete && (
            <button
              onClick={handleDeleteRoom}
              disabled={isDeleting}
              className="w-full px-4 py-2 text-left text-red-600 hover:bg-gray-100 flex items-center space-x-2"
            >
              <Trash className="w-4 h-4" />
              <span>{isDeleting ? 'Deleting...' : 'Delete Chat'}</span>
            </button>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <X className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}
    </div>
  );
}; 