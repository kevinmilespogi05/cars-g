import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { socketManager } from '../lib/socket';
import { ChatMessage } from '../types';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ChatHeader } from './ChatHeader';
import { checkAdminStatus } from '../services/adminService';
import { getApiUrl } from '../lib/config';

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  adminId?: string;
  position?: { x: number; y: number };
  unreadCount?: number;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ isOpen, onClose, adminId, position, unreadCount = 0 }) => {
  const { user, isAuthenticated } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isAdminOnline, setIsAdminOnline] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(typeof window !== 'undefined' ? window.innerWidth < 640 : false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Mobile detection and window resize effect
  useEffect(() => {
    const onResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      setIsMobile(newWidth < 640);
      setWindowSize({ width: newWidth, height: newHeight });
    };
    
    // Initialize window size
    onResize();
    
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToBottomImmediate = () => {
    const container = messagesContainerRef.current;
    
    if (container) {
      // Force scroll to bottom with multiple attempts
      const scrollToBottom = () => {
        container.scrollTop = container.scrollHeight;
      };
      
      // Try immediately
      scrollToBottom();
      
      // Try again after a short delay
      setTimeout(scrollToBottom, 10);
      setTimeout(scrollToBottom, 50);
      setTimeout(scrollToBottom, 100);
      
      // Also try scrollIntoView as backup
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
      }, 150);
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
    }
  };

  const loadExistingMessages = async () => {
    if (!user) {
      console.log('No user available for loading messages');
      return;
    }
    
    try {
      console.log('Loading existing messages for user:', user.id);
      
      // Use server API to get messages (bypasses RLS issues)
      const response = await fetch(getApiUrl(`/api/chat/messages/${user.id}`));
      console.log('API response status:', response.status);
      
      const data = await response.json();
      console.log('API response data:', data);

      if (!response.ok) {
        console.error('Error loading messages:', data.error);
        setError(`Failed to load messages: ${data.error}`);
        return;
      }

      console.log('Loaded existing messages:', data.messages);
      // Force a state update with a new array reference
      const newMessages = [...(data.messages || [])];
      setMessages(newMessages);
      
      // Ensure scroll to bottom after loading messages
      setTimeout(() => {
        scrollToBottomImmediate();
      }, 100);
      
    } catch (error) {
      console.error('Error loading existing messages:', error);
      setError(`Failed to load messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };


  // Handle scroll detection for scroll-to-bottom button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll to bottom when messages change
  useLayoutEffect(() => {
    if (messages.length > 0) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        scrollToBottomImmediate();
      });
    }
  }, [messages]);

  // Auto-scroll to bottom when chat opens
  useLayoutEffect(() => {
    if (isOpen && messages.length > 0) {
      // Use multiple attempts with different timings
      const attemptScroll = () => {
        scrollToBottomImmediate();
      };
      
      // Try immediately
      attemptScroll();
      
      // Try with various delays
      setTimeout(attemptScroll, 50);
      setTimeout(attemptScroll, 100);
      setTimeout(attemptScroll, 200);
      setTimeout(attemptScroll, 500);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isAuthenticated || !user) return;



    const initializeChat = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check admin status first
        const adminStatus = await checkAdminStatus();
        if (adminStatus.success) {
          setIsAdminOnline(adminStatus.isOnline);
        }

        // Connect to socket if not already connected
        if (!socketManager.isConnected()) {
          try {
            await socketManager.connect();
            setIsConnected(socketManager.isConnected());
          } catch (connectError) {
            // Gracefully handle connection failure - don't block the UI
            console.warn('Socket connection failed (chat will work offline):', connectError);
            setIsConnected(false);
            setError('Chat service is temporarily unavailable. Messages will be queued.');
          }
        } else {
          setIsConnected(true);
        }

        // Join admin chat - user joins their own admin chat
        if (user) {
          console.log('ChatWindow: Joining admin chat for user:', user.id);
          socketManager.joinAdminChat(user.id);
        }

        // Set up event listeners
        const handleMessageReceived = (message: ChatMessage) => {
          setMessages(prev => [...prev, message]);
        };

        const handleMessageSent = (message: ChatMessage) => {
          setMessages(prev => [...prev, message]);
        };

        const handleUserTyping = (data: { userId: string; isTyping: boolean }) => {
          if (data.userId !== user.id) {
            setIsTyping(data.isTyping);
            setTypingUser(data.isTyping ? data.userId : null);
          }
        };

        const handleAdminOnline = (data: { isOnline: boolean }) => {
          setIsAdminOnline(data.isOnline);
        };

        const handleChatError = (data: { error: string }) => {
          setError(data.error);
        };

        const handleMessageSeen = (data: { messageId: string; seenAt: string; isRead: boolean }) => {
          setMessages(prev => prev.map(msg => 
            msg.id === data.messageId 
              ? { ...msg, seen_at: data.seenAt, is_read: data.isRead }
              : msg
          ));
        };

        // Add event listeners
        socketManager.onMessageReceived(handleMessageReceived);
        socketManager.onMessageSent(handleMessageSent);
        socketManager.onUserTyping(handleUserTyping);
        socketManager.onAdminOnline(handleAdminOnline);
        socketManager.onChatError(handleChatError);
        socketManager.onMessageSeen(handleMessageSeen);

        // Load existing messages
        await loadExistingMessages();

        // Force scroll to bottom after everything is loaded
        setTimeout(() => {
          scrollToBottomImmediate();
        }, 300);
        
        // Additional scroll attempts
        setTimeout(() => {
          scrollToBottomImmediate();
        }, 600);
        setTimeout(() => {
          scrollToBottomImmediate();
        }, 1000);

        // Cleanup function
        return () => {
          socketManager.offMessageReceived(handleMessageReceived);
          socketManager.offMessageSent(handleMessageSent);
          socketManager.offUserTyping(handleUserTyping);
          socketManager.offAdminOnline(handleAdminOnline);
          socketManager.offChatError(handleChatError);
          socketManager.offMessageSeen(handleMessageSeen);
        };

      } catch (error: any) {
        // Gracefully handle errors - don't block the UI
        console.warn('Chat initialization error (non-fatal):', error);
        const errorMessage = error.message?.includes('Failed to fetch') || 
                            error.message?.includes('ERR_EMPTY_RESPONSE')
          ? 'Chat service is temporarily unavailable. Please check your connection or try again later.'
          : 'Failed to connect to chat. Some features may be limited.';
        setError(errorMessage);
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    };

    const cleanup = initializeChat();
    return () => {
      // Cleanup socket listeners
      cleanup.then(cleanupFn => cleanupFn?.());
    };
  }, [isOpen, isAuthenticated, user, adminId]);

  const handleSendMessage = (message: string) => {
    if (!message.trim() || !socketManager.isConnected()) return;

    // For now, we need to find the actual admin user ID
    // This is a temporary solution - in production, you'd want to get the actual admin user ID
    console.log('ChatWindow: Sending message to admin (placeholder)');
    // TODO: Get actual admin user ID from the system
    socketManager.sendMessage(message.trim(), 'admin-placeholder');
  };

  const handleTypingStart = () => {
    if (adminId) {
      socketManager.startTyping(adminId);
    }
  };

  const handleTypingStop = () => {
    if (adminId) {
      socketManager.stopTyping(adminId);
    }
  };

  const handleEnlarge = () => {
    setIsExpanded(true);
    setIsMaximized(true);
  };

  const handleMinimize = () => {
    setIsExpanded(false);
    setIsMaximized(false);
  };

  if (!isOpen) return null;

  // Calculate position for chat window - now fixed at bottom like Messenger
  const getChatPosition = () => {
    // Get viewport dimensions (use state for consistency)
    const viewportWidth = windowSize.width || window.innerWidth;
    const viewportHeight = windowSize.height || window.innerHeight;
    
    // Calculate safe margins and spacing
    const margin = 16; // Reduced margin for better integration
    const bottomMargin = 16; // Space from bottom edge
    const sidebarWidth = 288; // Account for sidebar navigation (w-72 = 288px)
    
    // On very small screens, sidebar might be collapsed
    const effectiveSidebarWidth = viewportWidth < 1024 ? 64 : sidebarWidth;
    
    // Chat dimensions - fixed at bottom
    const chatHeight = isMaximized ? 600 : (isExpanded ? 500 : 60); // Maximized: 600px, Expanded: 500px, Collapsed: 60px
    const chatWidth = isMaximized ? Math.min(500, viewportWidth - effectiveSidebarWidth - (margin * 2)) : Math.min(400, viewportWidth - effectiveSidebarWidth - (margin * 2));
    
    // Position at bottom right of screen
    const x = viewportWidth - chatWidth - margin;
    const y = viewportHeight - chatHeight - bottomMargin;
    
    return { 
      x, 
      y, 
      width: chatWidth, 
      height: chatHeight,
      isBottomFixed: true
    };
  };

  const chatPosition = getChatPosition();

  return (
    <div 
      className={`fixed z-40 bg-white border-t border-gray-200 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${
        isExpanded 
          ? 'rounded-t-2xl shadow-lg' 
          : 'rounded-t-xl shadow-sm'
      }`}
      style={{
        left: `${(chatPosition as any).x}px`,
        bottom: '16px',
        width: `${(chatPosition as any).width}px`,
        height: `${(chatPosition as any).height}px`,
        maxWidth: `${(chatPosition as any).width}px`,
        maxHeight: `${(chatPosition as any).height}px`,
        boxShadow: isExpanded 
          ? '0 -8px 20px -4px rgba(0, 0, 0, 0.08), 0 -2px 4px -1px rgba(0, 0, 0, 0.04)'
          : '0 -2px 8px -1px rgba(0, 0, 0, 0.06), 0 -1px 2px -1px rgba(0, 0, 0, 0.04)'
      }}
    >
      {isExpanded ? (
        <>
          <ChatHeader
            onClose={onClose}
            isConnected={isConnected}
            isAdminOnline={isAdminOnline}
            isLoading={isLoading}
            isExpanded={isExpanded}
            onEnlarge={handleEnlarge}
            onMinimize={handleMinimize}
          />
          
          {error && (
            <div className="px-4 py-3 bg-red-50/80 border-b border-red-200/50">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <p className="text-red-600 text-sm font-medium">{error}</p>
              </div>
            </div>
          )}

          <div 
            ref={messagesContainerRef} 
            className="flex-1 flex flex-col overflow-y-auto bg-gradient-to-b from-gray-50/50 to-white relative"
          >
            <MessageList
              messages={messages}
              currentUserId={user?.id}
              isTyping={isTyping}
              typingUser={typingUser}
            />
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

          <div className="border-t border-gray-200/50 bg-white/80 backdrop-blur-sm">
            <MessageInput
              onSendMessage={handleSendMessage}
              onTypingStart={handleTypingStart}
              onTypingStop={handleTypingStop}
              disabled={!isConnected || isLoading}
              placeholder={isAdminOnline ? "Type your message..." : "Admin is offline"}
            />
          </div>
        </>
      ) : (
        /* Collapsed view - compact header */
        <div 
          className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50/50 transition-colors"
          onClick={() => setIsExpanded(true)}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${isAdminOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="font-medium text-gray-800 text-sm">Chat with Admin</span>
            </div>
            {unreadCount > 0 && (
              <div className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-bold min-w-[20px] text-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isTyping && (
              <span className="text-xs text-gray-500">typing...</span>
            )}
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};
