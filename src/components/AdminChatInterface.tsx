import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { socketManager } from '../lib/socket';
import { AdminChat, ChatMessage } from '../types';
import { formatDistanceToNow, format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { getApiUrl } from '../lib/config';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
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
  Loader2,
  Phone,
  Video,
  Info,
  ArrowLeft,
  Image as ImageIcon,
  ThumbsUp,
  Menu
} from 'lucide-react';
import { useSidebarContext } from '../contexts/SidebarContext';

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
  const [messageInput, setMessageInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { isCollapsed, sidebarWidth, collapsedWidth } = useSidebarContext();
  // Local sidebar state used for mobile toggling of the conversations list
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

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

      const chatList = Array.from(chatMap.values())
        .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
      console.log('Loaded chats (sorted by newest first):', chatList);
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
            
            let updatedChats;
            if (existingChatIndex >= 0) {
              // Update existing chat
              updatedChats = [...prev];
              updatedChats[existingChatIndex] = {
                ...updatedChats[existingChatIndex],
                last_message: message.message,
                last_message_at: message.created_at,
                unread_count: updatedChats[existingChatIndex].unread_count + 1
              };
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
              updatedChats = [newChat, ...prev];
            }
            
            // Sort by newest first to maintain order
            return updatedChats.sort((a, b) => 
              new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
            );
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

        // Handle user online/offline events
        const handleUserOnline = (data: { userId: string }) => {
          console.log('User came online:', data.userId);
          setOnlineUsers(prev => new Set([...prev, data.userId]));
        };

        const handleUserOffline = (data: { userId: string }) => {
          console.log('User went offline:', data.userId);
          setOnlineUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(data.userId);
            return newSet;
          });
        };

        socketManager.onMessageReceived(handleMessageReceived);
        socketManager.onMessageSent(handleMessageSent);
        socketManager.onMessagesSeen(handleMessagesSeen);
        socketManager.onUserOnline(handleUserOnline);
        socketManager.onUserOffline(handleUserOffline);

        // Load existing chats from the database
        await loadExistingChats();

        return () => {
          socketManager.offMessageReceived(handleMessageReceived);
          socketManager.offMessageSent(handleMessageSent);
          socketManager.offMessagesSeen(handleMessagesSeen);
          socketManager.offUserOnline(handleUserOnline);
          socketManager.offUserOffline(handleUserOffline);
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
      console.log('Current admin user:', user);
      
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
      console.log('First message sender_id:', data.messages?.[0]?.sender_id, 'vs admin id:', user?.id);
      
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

  const handleSendMessage = (message: string = messageInput) => {
    if (!message.trim() || !selectedChat || !socketManager.isConnected()) return;

    socketManager.sendMessage(message.trim(), selectedChat.user_id);
    setMessageInput('');
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessageInput(prev => prev + emojiData.emoji);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, [messageInput]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showEmojiPicker]);

  // Filter chats based on search query
  const filteredChats = chats.filter(chat => 
    chat.user?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.last_message?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Keyboard navigation for chats
  useEffect(() => {
    const handleKeyboardNavigation = (e: KeyboardEvent) => {
      if (!selectedChat || filteredChats.length === 0) return;

      const currentIndex = filteredChats.findIndex(chat => chat.id === selectedChat.id);

      if (e.key === 'ArrowUp' && e.ctrlKey) {
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredChats.length - 1;
        handleChatSelect(filteredChats[prevIndex]);
      } else if (e.key === 'ArrowDown' && e.ctrlKey) {
        e.preventDefault();
        const nextIndex = currentIndex < filteredChats.length - 1 ? currentIndex + 1 : 0;
        handleChatSelect(filteredChats[nextIndex]);
      } else if (e.key === 'Escape' && showEmojiPicker) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('keydown', handleKeyboardNavigation);
    return () => document.removeEventListener('keydown', handleKeyboardNavigation);
  }, [selectedChat, filteredChats, showEmojiPicker]);

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

    container.addEventListener('scroll', handleScroll, { passive: true });
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

  // Compute effective app sidebar width from global context
  const effectiveSidebarWidth = isCollapsed ? collapsedWidth : sidebarWidth;

  return (
    <div
      className="bg-white w-full h-full flex overflow-hidden max-h-full transition-all duration-300 ease-in-out"
      // expose CSS variable for child calculations
      style={{ ['--app-sidebar-width' as any]: `${effectiveSidebarWidth}px` }}
    >
        {/* Chat List Sidebar - Messenger Style */}
        <div 
          className={`flex-shrink-0 border-r border-gray-200 flex flex-col bg-white transition-all duration-300 h-full overflow-hidden`}
          // left panel width should adapt to available space minus the app sidebar
          // use calc() and the CSS variable set on the parent
          style={{
            width: `min(24rem, calc((100% - var(--app-sidebar-width)) * 0.33))`,
            maxWidth: '28rem',
            display: isSidebarOpen ? undefined : 'none'
          }}
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Chats</h2>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <MoreVertical className="w-6 h-6 text-gray-600" />
                </button>
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-full text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>

            {/* Connection Status */}
            <div className="mt-3 flex items-center gap-2">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  isLoading ? 'bg-yellow-400' : 
                  isConnected ? 'bg-green-400' : 'bg-red-400'
                }`} 
              />
              <span className="text-sm text-gray-600 font-medium">
                {isLoading ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            {error && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                {error}
              </div>
            )}
          </div>

          {/* Conversations List */}
          <div 
            className="flex-1 overflow-y-auto"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {filteredChats.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-base font-semibold text-gray-700">
                  {searchQuery ? 'No results found' : 'No conversations yet'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {searchQuery ? 'Try a different search' : 'New messages will appear here'}
                </p>
              </div>
            ) : (
              <div>
                {filteredChats.map((chat) => (
                  <motion.button
                    key={chat.id}
                    onClick={() => {
                      handleChatSelect(chat);
                      if (window.innerWidth < 768) {
                        setIsSidebarOpen(false);
                      }
                    }}
                    whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.02)' }}
                    className={`w-full p-3 text-left transition-all duration-150 flex items-center gap-3 border-b border-gray-100 ${
                      selectedChat?.id === chat.id 
                        ? 'bg-blue-50' 
                        : ''
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      {chat.user?.avatar_url ? (
                        <img
                          src={chat.user.avatar_url}
                          alt={chat.user.username}
                          className="w-14 h-14 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-xl font-semibold text-white">
                            {chat.user?.username?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                      )}
                      {onlineUsers.has(chat.user_id) && (
                        <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-base truncate ${
                          chat.unread_count > 0 ? 'font-bold text-gray-900' : 'font-semibold text-gray-900'
                        }`}>
                          {chat.user?.username || 'Unknown User'}
                        </p>
                        <span className="text-sm text-gray-500 ml-2 flex-shrink-0 font-medium">
                          {formatTime(chat.last_message_at)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className={`text-sm truncate ${
                          chat.unread_count > 0 ? 'font-semibold text-gray-900' : 'text-gray-600'
                        }`}>
                          {chat.last_message}
                        </p>
                        {chat.unread_count > 0 && (
                          <div className="ml-2 bg-blue-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold flex-shrink-0">
                            {chat.unread_count}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Messages Area */}
        <div
          className={`flex-1 flex flex-col bg-white ${selectedChat ? '' : 'hidden md:flex'} h-full overflow-hidden min-w-0 transition-all duration-300 ease-in-out`}
          // ensure this area fills remaining space and responds to sidebar variable
          style={{
            // available width = 100% - left panel width - app sidebar width
            // but flex-1 with min-w-0 and the left panel width ensures proper behavior
            paddingLeft: 0
          }}
        >
          {selectedChat ? (
            <>
              {/* Chat Header - Messenger Style */}
              <div className="px-4 py-3 border-b border-gray-200 bg-white shadow-sm flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Mobile back button */}
                    <button 
                      onClick={() => setIsSidebarOpen(true)}
                      className="md:hidden p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>

                    {/* User Info */}
                    <div className="relative flex-shrink-0">
                      {selectedChat.user?.avatar_url ? (
                        <img
                          src={selectedChat.user.avatar_url}
                          alt={selectedChat.user.username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-white">
                            {selectedChat.user?.username?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                      )}
                      {onlineUsers.has(selectedChat.user_id) && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    
                    <div>
                      <p className="text-base font-semibold text-gray-900">
                        {selectedChat.user?.username || 'Unknown User'}
                      </p>
                      <div className="flex items-center gap-1">
                        {onlineUsers.has(selectedChat.user_id) ? (
                          <>
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <p className="text-sm text-gray-500">Active now</p>
                          </>
                        ) : (
                          <p className="text-sm text-gray-400">Offline</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1">
                    <button className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Call">
                      <Phone className="w-5 h-5 text-blue-500" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Video call">
                      <Video className="w-5 h-5 text-blue-500" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Conversation info">
                      <Info className="w-5 h-5 text-blue-500" />
                    </button>
                  </div>
                </div>
              </div>

               {/* Messages - Messenger Style */}
               <div 
                 ref={messagesContainerRef} 
                 className="flex-1 overflow-y-auto p-4 bg-white min-h-0"
                 onWheel={(e) => e.stopPropagation()}
                 onTouchMove={(e) => e.stopPropagation()}
               >
                {isLoading ? (
                  <div className="text-center text-gray-500 py-12">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
                    <p className="text-base font-semibold">Loading messages...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <MessageCircle className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-base font-semibold text-gray-700">No messages yet</p>
                    <p className="text-sm text-gray-500 mt-1">Start the conversation</p>
                  </div>
                ) : (
                  <div className="space-y-2">{
                  messages.map((message, index) => {
                    const isOwn = message.sender_id === user?.id;
                    const showAvatar = index === messages.length - 1 || messages[index + 1]?.sender_id !== message.sender_id;
                    const isNextSameSender = index < messages.length - 1 && messages[index + 1]?.sender_id === message.sender_id;
                    
                    // Determine user info based on who actually sent the message
                    let userName: string;
                    let userAvatar: string;
                    
                    if (message.sender?.username) {
                      userName = message.sender.username;
                      userAvatar = message.sender.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random&size=128`;
                    } else {
                      if (isOwn) {
                        userName = user?.username || 'Admin';
                        userAvatar = user?.avatar_url || `https://ui-avatars.com/api/?name=Admin&background=3b82f6&color=fff&size=128`;
                      } else {
                        userName = selectedChat?.user?.username || 'User';
                        userAvatar = selectedChat?.user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random&size=128`;
                      }
                    }
                    
                    return (
                      <motion.div
                        key={message.id}
                        data-message-id={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'} ${isNextSameSender ? 'mb-1' : 'mb-3'}`}
                      >
                        {/* Avatar for received messages (left side) */}
                        {!isOwn && (
                          <div className="flex-shrink-0 w-7">
                            {showAvatar ? (
                              <img
                                src={userAvatar}
                                alt={userName}
                                className="w-7 h-7 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-7"></div>
                            )}
                          </div>
                        )}

                        {/* Message bubble - Messenger style */}
                        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[75%] md:max-w-[65%]`}>
                          <div
                            className={`
                              px-4 py-3 rounded-2xl transition-all duration-150 group relative
                              ${isOwn 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-gray-100 text-gray-900'
                              }
                            `}
                          >
                            <p className="text-base break-words leading-relaxed whitespace-pre-wrap font-normal">
                              {message.message}
                            </p>
                            
                            {/* Hover: show timestamp */}
                            <div className={`
                              absolute -bottom-6 opacity-0 group-hover:opacity-100 transition-opacity text-sm text-gray-500 font-medium
                              ${isOwn ? 'right-0' : 'left-0'}
                            `}>
                              {format(new Date(message.created_at), 'MMM d, h:mm a')}
                              {isOwn && message.seen_at && ' • Seen'}
                            </div>
                          </div>
                        </div>

                        {/* Avatar for sent messages (right side) */}
                        {isOwn && (
                          <div className="flex-shrink-0 w-7">
                            {showAvatar ? (
                              <img
                                src={userAvatar}
                                alt={userName}
                                className="w-7 h-7 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-7"></div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                  </div>
                )}
                
                {/* Typing Indicator */}
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="flex items-end gap-2 mb-3"
                  >
                    <div className="flex-shrink-0 w-7">
                      {selectedChat?.user?.avatar_url ? (
                        <img
                          src={selectedChat.user.avatar_url}
                          alt={selectedChat.user.username}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-7 h-7 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-xs font-semibold text-white">
                            {selectedChat?.user?.username?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="px-4 py-2 bg-gray-100 rounded-2xl">
                      <div className="flex gap-1">
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                          className="w-2 h-2 bg-gray-400 rounded-full"
                        />
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                          className="w-2 h-2 bg-gray-400 rounded-full"
                        />
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                          className="w-2 h-2 bg-gray-400 rounded-full"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
                
                <div ref={messagesEndRef} />
                
                {/* Scroll to bottom button */}
                {showScrollButton && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={scrollToBottom}
                    className="absolute bottom-4 right-4 p-2 bg-white border border-gray-300 text-gray-700 rounded-full shadow-lg hover:bg-gray-50 transition-colors duration-200 z-10"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </motion.button>
                )}
              </div>

              {/* Message Input - Messenger Style */}
              <div className="p-3 border-t border-gray-200 bg-white flex-shrink-0">
                <div className="flex items-end gap-2">
                  {/* Action buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="p-2 text-blue-500 hover:bg-gray-100 rounded-full transition-colors"
                      title="Add image"
                    >
                      <ImageIcon className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      className="p-2 text-blue-500 hover:bg-gray-100 rounded-full transition-colors"
                      title="Attach file"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Input container */}
                  <div className="flex-1 relative">
                    <div className="relative bg-gray-100 rounded-3xl focus-within:bg-gray-200 transition-all">
                      <textarea
                        ref={inputRef}
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        rows={1}
                        className="w-full px-4 py-3 pr-10 bg-transparent rounded-3xl focus:outline-none resize-none text-base text-gray-900 placeholder-gray-500 max-h-32"
                        style={{
                          minHeight: '44px',
                          maxHeight: '120px'
                        }}
                      />
                      
                      {/* Emoji button */}
                      <div className="absolute right-2 bottom-2">
                        <button
                          type="button"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className={`p-1.5 rounded-full transition-colors ${
                            showEmojiPicker 
                              ? 'text-blue-500 bg-blue-50' 
                              : 'text-gray-500 hover:bg-gray-200'
                          }`}
                          title="Add emoji"
                        >
                          <Smile className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Emoji Picker */}
                    <AnimatePresence>
                      {showEmojiPicker && (
                        <motion.div
                          ref={emojiPickerRef}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute bottom-full right-0 mb-2 z-50 shadow-2xl rounded-lg overflow-hidden"
                        >
                          <EmojiPicker
                            onEmojiClick={handleEmojiClick}
                            theme={Theme.LIGHT}
                            width={320}
                            height={400}
                            searchPlaceHolder="Search emoji"
                            previewConfig={{ showPreview: false }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  {/* Send button or Like button */}
                  {messageInput.trim() ? (
                    <button
                      type="button"
                      onClick={() => handleSendMessage()}
                      className="p-2 text-blue-500 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                      title="Send message"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="p-2 text-blue-500 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                      title="Send like"
                    >
                      <ThumbsUp className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 bg-white">
              <div className="text-center px-4">
                <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-xl font-semibold text-gray-900 mb-2">
                  No conversation selected
                </p>
                <p className="text-base text-gray-500">
                  Choose a conversation to start chatting
                </p>
              </div>
            </div>
          )}
        </div>
    </div>
  );
};
