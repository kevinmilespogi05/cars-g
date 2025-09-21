import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { socketManager } from '../lib/socket';
import { AdminChat, ChatMessage } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../lib/supabase';
import { getApiUrl } from '../lib/config';
import { 
  MessageCircle, 
  X, 
  Search, 
  MoreVertical, 
  Send, 
  Paperclip, 
  Smile,
  Users,
  Clock,
  Check,
  CheckCheck,
  Wifi,
  WifiOff,
  Loader2
} from 'lucide-react';

interface AdminChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminChatInterface: React.FC<AdminChatInterfaceProps> = ({
  isOpen,
  onClose
}) => {
  const { user, isAuthenticated } = useAuthStore();
  const [chats, setChats] = useState<AdminChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<AdminChat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [seenMessageIds, setSeenMessageIds] = useState<Set<string>>(new Set());
  const seenTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToBottomImmediate = () => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  };

  // Auto-scroll when messages change
  useLayoutEffect(() => {
    if (messages.length > 0) {
      // Use double requestAnimationFrame to ensure DOM is fully updated
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottomImmediate();
        });
      });
    }
  }, [messages]);

  const loadExistingChats = async () => {
    try {
      console.log('Loading existing chats...');
      
      // Use server API to get all messages
      const response = await fetch(getApiUrl('/api/test/chat-messages'));
      const data = await response.json();
      
      console.log('All messages from API:', data);

      if (!response.ok) {
        console.error('Error loading messages:', data.error);
        return;
      }

      // Group messages by sender and create chat entries
      const chatMap = new Map();
      
      data.messages?.forEach((msg: any) => {
        // Only include messages sent to admin
        if (msg.receiver_id === 'c5e7d75b-3f1b-4f85-b5a5-6b3786daea48') {
          const senderId = msg.sender_id;
          console.log('Processing message from sender:', senderId, 'sender info:', msg.sender);
          if (!chatMap.has(senderId)) {
            chatMap.set(senderId, {
              id: `chat_${senderId}`,
              user_id: senderId,
              admin_id: 'c5e7d75b-3f1b-4f85-b5a5-6b3786daea48',
              last_message: msg.message,
              last_message_at: msg.created_at,
              unread_count: 0, // We'll calculate this separately
              is_active: true,
              created_at: msg.created_at,
              updated_at: msg.created_at,
              user: {
                id: senderId,
                username: msg.sender?.username || 'User',
                avatar_url: msg.sender?.avatar_url || null,
                email: msg.sender?.email || null
              }
            });
          } else {
            // Update existing chat with latest message
            const existingChat = chatMap.get(senderId);
            if (new Date(msg.created_at) > new Date(existingChat.last_message_at)) {
              existingChat.last_message = msg.message;
              existingChat.last_message_at = msg.created_at;
              existingChat.updated_at = msg.created_at;
            }
          }
        }
      });

      const chatList = Array.from(chatMap.values());
      console.log('Loaded chats:', chatList);
      setChats(chatList);
      
    } catch (error) {
      console.error('Error loading existing chats:', error);
    }
  };

  useEffect(() => {
    if (!isOpen || !isAuthenticated || !user || user.role !== 'admin') return;

    // Scroll to bottom when admin chat opens
    if (isOpen && messages.length > 0) {
      setTimeout(() => {
        scrollToBottomImmediate();
      }, 100);
    }

    // Prevent background scrolling when admin chat is open
    const preventBackgroundScroll = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // Add event listeners to prevent background scroll
    document.addEventListener('wheel', preventBackgroundScroll, { passive: false });
    document.addEventListener('touchmove', preventBackgroundScroll, { passive: false });

    const initializeAdminChat = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Connect to socket if not already connected
        if (!socketManager.isConnected()) {
          await socketManager.connect();
        }

        setIsConnected(true);

        // Set up event listeners
        const handleMessageReceived = (message: ChatMessage) => {
          console.log('Admin received message:', message);
          setMessages(prev => [...prev, message]);
          
          // Update or create chat entry
          setChats(prev => {
            const existingChatIndex = prev.findIndex(chat => chat.user_id === message.sender_id);
            
            if (existingChatIndex >= 0) {
              // Update existing chat
              const updatedChats = [...prev];
              updatedChats[existingChatIndex] = {
                ...updatedChats[existingChatIndex],
                last_message: message.message,
                last_message_at: message.created_at,
                unread_count: updatedChats[existingChatIndex].unread_count + 1
              };
              return updatedChats;
            } else {
              // Create new chat entry
              const newChat: AdminChat = {
                id: `chat_${message.sender_id}`,
                user_id: message.sender_id,
                admin_id: 'c5e7d75b-3f1b-4f85-b5a5-6b3786daea48',
                last_message: message.message,
                last_message_at: message.created_at,
                unread_count: 1,
                is_active: true,
                created_at: message.created_at,
                updated_at: message.created_at,
                user: message.sender
              };
              return [newChat, ...prev];
            }
          });
        };

        const handleMessageSent = (message: ChatMessage) => {
          setMessages(prev => [...prev, message]);
        };

        const handleMessagesSeen = (data: { messageIds: string[] }) => {
          setMessages(prev => prev.map(msg => 
            data.messageIds.includes(msg.id) 
              ? { ...msg, seen_at: new Date().toISOString(), is_read: true }
              : msg
          ));
          // Update seen message IDs
          setSeenMessageIds(prev => new Set([...prev, ...data.messageIds]));
        };

        socketManager.onMessageReceived(handleMessageReceived);
        socketManager.onMessageSent(handleMessageSent);
        socketManager.onMessagesSeen(handleMessagesSeen);

        // Load existing chats from the database
        await loadExistingChats();

        return () => {
          socketManager.offMessageReceived(handleMessageReceived);
          socketManager.offMessageSent(handleMessageSent);
          socketManager.offMessagesSeen(handleMessagesSeen);
        };

      } catch (error) {
        console.error('Admin chat initialization error:', error);
        setError('Failed to connect to admin chat. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    const cleanup = initializeAdminChat();
    return () => {
      // Remove background scroll prevention
      document.removeEventListener('wheel', preventBackgroundScroll);
      document.removeEventListener('touchmove', preventBackgroundScroll);
      
      // Cleanup socket listeners
      cleanup.then(cleanupFn => cleanupFn?.());
    };
  }, [isOpen, isAuthenticated, user]);

  const loadMessagesForChat = async (userId: string) => {
    setIsLoading(true);
    try {
      console.log('Loading messages for user:', userId);
      
      // Use server API to get messages (bypasses RLS issues)
      const response = await fetch(getApiUrl(`/api/chat/messages/${userId}`));
      console.log('API response status:', response.status);
      
      const data = await response.json();
      console.log('API response data:', data);

      if (!response.ok) {
        console.error('Error loading messages:', data.error);
        setError(`Failed to load messages: ${data.error}`);
        return;
      }

      console.log('Loaded messages:', data.messages);
      // Force a state update with a new array reference
      const newMessages = [...(data.messages || [])];
      setMessages(newMessages);
      
    } catch (error) {
      console.error('Error loading messages for chat:', error);
      setError(`Failed to load messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatSelect = (chat: AdminChat) => {
    setSelectedChat(chat);
    setMessages([]); // Clear messages first
    setChats(prev => prev.map(c => 
      c.id === chat.id ? { ...c, unread_count: 0 } : c
    ));
    
    // Load messages for this chat
    loadMessagesForChat(chat.user_id);
  };

  const markMessagesAsSeen = useCallback((messageIds: string[]) => {
    if (socketManager.isConnected() && messageIds.length > 0) {
      // Filter out already seen messages
      const unseenMessageIds = messageIds.filter(id => !seenMessageIds.has(id));
      if (unseenMessageIds.length > 0) {
        socketManager.markMessagesAsSeen(unseenMessageIds);
        setSeenMessageIds(prev => new Set([...prev, ...unseenMessageIds]));
      }
    }
  }, [seenMessageIds]);

  // Auto-mark messages as seen when admin views them (with debouncing)
  const markVisibleMessagesAsSeen = useCallback(() => {
    if (!selectedChat || !user) return;

    // Clear existing timeout
    if (seenTimeoutRef.current) {
      clearTimeout(seenTimeoutRef.current);
    }

    // Debounce the seen marking to prevent excessive API calls
    seenTimeoutRef.current = setTimeout(() => {
      const unreadMessages = messages.filter(msg => 
        msg.sender_id !== user.id && 
        !msg.seen_at && 
        !seenMessageIds.has(msg.id)
      );

      if (unreadMessages.length > 0) {
        const messageIds = unreadMessages.map(msg => msg.id);
        markMessagesAsSeen(messageIds);
      }
    }, 300); // 300ms debounce
  }, [selectedChat, user, messages, markMessagesAsSeen, seenMessageIds]);

  const handleSendMessage = (message: string) => {
    if (!message.trim() || !selectedChat || !socketManager.isConnected()) return;

    socketManager.sendMessage(message.trim(), selectedChat.user_id);
  };

  // Auto-mark messages as seen when chat is selected
  useEffect(() => {
    if (selectedChat && messages.length > 0) {
      // Small delay to ensure messages are rendered
      const timer = setTimeout(() => {
        markVisibleMessagesAsSeen();
      }, 500);
      return () => {
        clearTimeout(timer);
        if (seenTimeoutRef.current) {
          clearTimeout(seenTimeoutRef.current);
        }
      };
    }
  }, [selectedChat, messages.length, markVisibleMessagesAsSeen]);

  // Auto-mark messages as seen when messages change
  useEffect(() => {
    if (selectedChat && messages.length > 0) {
      const timer = setTimeout(() => {
        markVisibleMessagesAsSeen();
      }, 1000);
      return () => {
        clearTimeout(timer);
        if (seenTimeoutRef.current) {
          clearTimeout(seenTimeoutRef.current);
        }
      };
    }
  }, [messages, markVisibleMessagesAsSeen]);

  // Auto-mark messages as seen when admin scrolls through messages
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Mark messages as seen when admin scrolls
      markVisibleMessagesAsSeen();
      
      // Show/hide scroll to bottom button
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [markVisibleMessagesAsSeen]);

  // Intersection Observer to mark messages as seen when they come into view
  useEffect(() => {
    if (!selectedChat || !user) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageElement = entry.target as HTMLElement;
            const messageId = messageElement.dataset.messageId;
            if (messageId && !seenMessageIds.has(messageId)) {
              // Check if this is a message from a user (not admin)
              const message = messages.find(msg => msg.id === messageId);
              if (message && message.sender_id !== user.id && !message.seen_at) {
                markMessagesAsSeen([messageId]);
              }
            }
          }
        });
      },
      {
        root: messagesContainerRef.current,
        rootMargin: '0px',
        threshold: 0.5 // Mark as seen when 50% of message is visible
      }
    );

    // Observe all message elements
    const messageElements = messagesContainerRef.current?.querySelectorAll('[data-message-id]');
    messageElements?.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
    };
  }, [selectedChat, user, messages, seenMessageIds, markMessagesAsSeen]);

  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Just now';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 w-full h-full flex overflow-hidden">
        {/* Chat List Sidebar */}
        <div className="w-80 border-r border-gray-200/50 flex flex-col bg-gradient-to-b from-gray-50/80 to-white/80">
          <div className="p-6 border-b border-gray-200/50 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 backdrop-blur-sm">
            <div className="flex items-center mb-4">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Users className="w-6 h-6 text-blue-600" />
                  {isLoading && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="absolute -top-1 -right-1"
                    >
                      <Loader2 className="w-3 h-3 text-blue-500" />
                    </motion.div>
                  )}
                </div>
                <h2 className="text-lg font-bold text-gray-900">Admin Chat</h2>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  isLoading ? 'bg-yellow-400' : 
                  isConnected ? 'bg-green-400' : 'bg-red-400'
                }`} 
              />
              <div className="flex items-center space-x-2">
                {isLoading ? (
                  <span className="text-sm text-yellow-600 font-medium">Connecting...</span>
                ) : isConnected ? (
                  <>
                    <Wifi className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600 font-medium">Connected</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-red-600 font-medium">Disconnected</span>
                  </>
                )}
              </div>
            </div>
            
            {error && (
              <div className="mt-3 p-3 bg-red-50/80 border border-red-200/50 text-red-700 rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <strong>Error:</strong> {error}
                </div>
              </div>
            )}
          </div>

           <div 
             className="flex-1 overflow-y-auto"
             onWheel={(e) => e.stopPropagation()}
             onTouchMove={(e) => e.stopPropagation()}
           >
             {chats.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-600">No active chats</p>
                <p className="text-xs text-gray-400 mt-1">Users will appear here when they send messages</p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {chats.map((chat, index) => (
                  <button
                    key={chat.id}
                    onClick={() => handleChatSelect(chat)}
                    className={`w-full p-4 text-left rounded-xl transition-all duration-200 ${
                      selectedChat?.id === chat.id 
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 shadow-md' 
                        : 'hover:bg-gray-50/80 border border-transparent hover:border-gray-200'
                    }`}
                  >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 relative">
                          {chat.user?.avatar_url ? (
                            <img
                              src={chat.user.avatar_url}
                              alt={chat.user.username}
                              className="w-12 h-12 rounded-full border-2 border-white shadow-sm"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                              <span className="text-sm font-semibold text-white">
                                {chat.user?.username?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            </div>
                          )}
                          {chat.unread_count > 0 && (
                            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-lg">
                              {chat.unread_count}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {chat.user?.username || 'Unknown User'}
                            </p>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3 text-gray-400" />
                              <p className="text-xs text-gray-400">
                                {formatTime(chat.last_message_at)}
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 truncate leading-relaxed">
                            {chat.last_message}
                          </p>
                        </div>
                      </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Messages Area */}
        <div className="flex-1 flex flex-col bg-gradient-to-b from-gray-50/50 to-white">
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="p-6 border-b border-gray-200/50 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 relative">
                    {selectedChat.user?.avatar_url ? (
                      <img
                        src={selectedChat.user.avatar_url}
                        alt={selectedChat.user.username}
                        className="w-12 h-12 rounded-full border-2 border-white shadow-md"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center border-2 border-white shadow-md">
                        <span className="text-sm font-semibold text-white">
                          {selectedChat.user?.username?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedChat.user?.username || 'Unknown User'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {selectedChat.user?.email || 'User'}
                    </p>
                  </div>
                  <button
                    className="p-2 hover:bg-gray-200/80 rounded-full transition-all duration-200"
                  >
                    <MoreVertical className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

               {/* Messages */}
               <div 
                 ref={messagesContainerRef} 
                 className="flex-1 overflow-y-auto p-6 space-y-4 relative"
                 onWheel={(e) => e.stopPropagation()}
                 onTouchMove={(e) => e.stopPropagation()}
               >
                {isLoading ? (
                  <div className="text-center text-gray-500 py-12">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
                    <p className="text-sm font-medium">Loading messages...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-12">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full flex items-center justify-center shadow-lg">
                      <MessageCircle className="w-10 h-10 text-blue-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">No messages yet</p>
                    <p className="text-xs text-gray-400 mt-1">Start the conversation with this user</p>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const isOwn = message.sender_id === user?.id;
                    return (
                      <div
                        key={message.id}
                        data-message-id={message.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div 
                          className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-md ${
                            isOwn
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                              : 'bg-white text-gray-900 border border-gray-100'
                          }`}
                        >
                            <p className="text-sm leading-relaxed">{message.message}</p>
                            <div className={`flex items-center justify-between mt-2 ${
                              isOwn ? 'text-blue-100' : 'text-gray-500'
                            }`}>
                              <p className="text-xs">
                                {formatTime(message.created_at)}
                              </p>
                              {isOwn && (
                                <div className="flex items-center">
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
                <div ref={messagesEndRef} />
                
                {/* Scroll to bottom button */}
                {showScrollButton && (
                  <button
                    onClick={scrollToBottom}
                    className="absolute bottom-4 right-4 p-3 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors duration-200 z-10"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Message Input */}
              <div className="p-6 border-t border-gray-200/50 bg-white/80 backdrop-blur-sm">
                <div className="flex items-end space-x-3">
                  <div className="flex-1 relative">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Type your message..."
                        className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-300 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleSendMessage(e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                      
                      {/* Attachment and emoji buttons */}
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                        <button
                          className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <Paperclip className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <Smile className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                      if (input?.value) {
                        handleSendMessage(input.value);
                        input.value = '';
                      }
                    }}
                    className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl shadow-lg hover:shadow-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full flex items-center justify-center shadow-lg">
                  <MessageCircle className="w-12 h-12 text-blue-400" />
                </div>
                <p className="text-xl font-semibold text-gray-700 mb-2">
                  Select a chat to start messaging
                </p>
                <p className="text-sm text-gray-500">
                  Choose a conversation from the sidebar to begin
                </p>
              </div>
            </div>
          )}
        </div>
    </div>
  );
};
