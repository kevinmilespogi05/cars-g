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
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ isOpen, onClose, adminId }) => {
  const { user, isAuthenticated } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isAdminOnline, setIsAdminOnline] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

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

    container.addEventListener('scroll', handleScroll);
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
          await socketManager.connect();
        }

        setIsConnected(true);

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

      } catch (error) {
        console.error('Chat initialization error:', error);
        setError('Failed to connect to chat. Please try again.');
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

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed bottom-6 right-6 z-50 bg-white rounded-3xl shadow-2xl border border-gray-300/50 flex flex-col overflow-hidden transition-all duration-300 ease-in-out backdrop-blur-sm ${
        isExpanded 
          ? 'w-96 h-[600px]' 
          : 'w-80 h-96'
      }`}
      style={{
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)'
      }}
    >
      <ChatHeader
        onClose={onClose}
        isConnected={isConnected}
        isAdminOnline={isAdminOnline}
        isLoading={isLoading}
        isExpanded={isExpanded}
        onToggleExpand={() => setIsExpanded(!isExpanded)}
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
    </div>
  );
};
