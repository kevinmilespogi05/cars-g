import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatConversationList } from '../components/ChatConversationList';
import { ChatMessage } from '../components/ChatMessage';
import { ChatInput } from '../components/ChatInput';
import { ChatDemo } from '../components/ChatDemo';
import { NewConversationModal } from '../components/NewConversationModal';
import { NotificationPermissionRequest } from '../components/NotificationPermissionRequest';

import { ChatConversation, ChatMessage as ChatMessageType } from '../types';
import { ChatService } from '../services/chatService';
import { useOptimizedRealTime } from '../hooks/useOptimizedRealTime';
import { useChatSocket } from '../hooks/useChatSocket';
import { useAuthStore } from '../store/authStore';
import { useChatNotifications } from '../hooks/useChatNotifications';
import { ArrowLeftIcon, MessageCircleIcon, PlusIcon, WifiIcon, WifiOffIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import '../components/ChatMobile.css';

export const Chat: React.FC = () => {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);

  // Helper function to sort conversations by last_message_at (newest first)
  const sortConversations = (conversations: ChatConversation[]): ChatConversation[] => {
    return conversations.sort((a, b) => {
      // If both have last_message_at, sort by timestamp
      if (a.last_message_at && b.last_message_at) {
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
      }
      // If only one has last_message_at, prioritize the one with a message
      if (a.last_message_at && !b.last_message_at) return -1;
      if (!a.last_message_at && b.last_message_at) return 1;
      // If neither has last_message_at, sort by creation date (newest first)
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  };
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showMobileConversationList, setShowMobileConversationList] = useState(true);

  // Chat notifications hook
  const { markConversationAsRead, unreadCount } = useChatNotifications();

  // Mobile-specific improvements
  useEffect(() => {
    // Prevent zoom on input focus for mobile devices
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    // Handle window resize to manage mobile state
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        // Desktop view - always show both
        setShowMobileConversationList(false);
      } else {
        // Mobile view - show conversation list if no conversation selected
        if (!selectedConversation) {
          setShowMobileConversationList(true);
        }
      }
    };

    document.addEventListener('touchstart', preventZoom, { passive: false });
    window.addEventListener('resize', handleResize);
    
    // Initial check
    handleResize();
    
    return () => {
      document.removeEventListener('touchstart', preventZoom);
      window.removeEventListener('resize', handleResize);
    };
  }, [selectedConversation]);

  // Define handlers before using them in the hook
  const handleNewMessage = useCallback((message: ChatMessageType) => {
    console.log('New message received:', message);
    
    // Add message to current conversation if it matches
    if (selectedConversation && message.conversation_id === selectedConversation.id) {
      setMessages(prev => [...prev, message]);
    }
    
    // Update conversation in list with new message and resort
    setConversations(prev => {
      const updatedConversations = prev.map(conv => 
        conv.id === message.conversation_id 
          ? { ...conv, last_message: message, last_message_at: message.created_at }
          : conv
      );
      
      // Resort conversations by last_message_at (newest first)
      return sortConversations(updatedConversations);
    });
  }, [selectedConversation]);

  const handleUserTyping = useCallback((userId: string, username: string) => {
    setTypingUsers(prev => new Set(prev).add(username));
  }, []);

  const handleUserStoppedTyping = useCallback((userId: string) => {
    setTypingUsers(prev => {
      const newSet = new Set(prev);
      newSet.delete(userId);
      return newSet;
    });
  }, []);

  // Chat socket hook for real-time messaging
  const {
    socket,
    isConnected,
    isAuthenticated,
    sendMessage,
    joinConversation,
    leaveConversation,
    startTyping,
    stopTyping,
  } = useChatSocket({
    userId: user?.id || '',
    onMessage: handleNewMessage,
    onTyping: handleUserTyping,
    onTypingStop: handleUserStoppedTyping,
  });

  // Debug logging for WebSocket status
  useEffect(() => {
    console.log('WebSocket Status:', {
      isConnected,
      isAuthenticated,
      socketId: socket?.id,
      userId: user?.id
    });
  }, [isConnected, isAuthenticated, socket?.id, user?.id]);

  // Optimized real-time hook for other features
  const {
    connectionQuality,
    stats,
    trackActivity,
  } = useOptimizedRealTime({
    enableChat: false, // We're handling chat separately
    enableReports: false,
    debounceDelay: 100,
    batchDelay: 50,
  });

  // Update activity tracking
  useEffect(() => {
    if (messages.length > 0) {
      trackActivity();
    }
  }, [messages, trackActivity]);

  // Load conversations and profiles on mount
  useEffect(() => {
    if (user?.id) {
      loadConversations();
      loadProfiles();
    }
  }, [user?.id]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      joinConversation(selectedConversation.id);
      
      // Mark conversation as read when selected
      markConversationAsRead(selectedConversation.id);
    }
  }, [selectedConversation, joinConversation, markConversationAsRead]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // WebSocket event listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    // Listen for new messages
    const handleSocketMessage = (message: ChatMessageType) => {
      console.log('Socket message received:', message);
      handleNewMessage(message);
    };

    // Listen for typing events
    const handleSocketTyping = (data: { userId: string; username: string }) => {
      console.log('User typing:', data);
      handleUserTyping(data.userId, data.username);
    };

    const handleSocketTypingStop = (data: { userId: string }) => {
      console.log('User stopped typing:', data);
      handleUserStoppedTyping(data.userId);
    };

    // Add event listeners
    socket.on('new_message', handleSocketMessage);
    socket.on('user_typing', handleSocketTyping);
    socket.on('user_stopped_typing', handleSocketTypingStop);

    // Cleanup
    return () => {
      socket.off('new_message', handleSocketMessage);
      socket.off('user_typing', handleSocketTyping);
      socket.off('user_stopped_typing', handleSocketTypingStop);
    };
  }, [socket, handleNewMessage, handleUserTyping, handleUserStoppedTyping]);

  // Cleanup when leaving conversation
  useEffect(() => {
    return () => {
      if (selectedConversation) {
        leaveConversation(selectedConversation.id);
      }
    };
  }, [selectedConversation, leaveConversation]);

  // Handle mobile state when conversation is selected/deselected
  useEffect(() => {
    // On mobile, when a conversation is selected, hide the conversation list
    if (selectedConversation && window.innerWidth < 768) {
      setShowMobileConversationList(false);
    }
    // On mobile, when no conversation is selected, show the conversation list
    else if (!selectedConversation && window.innerWidth < 768) {
      setShowMobileConversationList(true);
    }
  }, [selectedConversation]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await ChatService.getConversations(user!.id);
      
      // Sort conversations by last_message_at (newest first)
      const sortedConversations = sortConversations(data);
      setConversations(sortedConversations);
      
      // Show demo if no conversations
      if (data.length === 0) {
        setShowDemo(true);
      }
    } catch (err) {
      setError('Failed to load conversations');
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, email, avatar_url')
        .eq('is_banned', false);

      if (error) throw error;
      setProfiles(data || []);
    } catch (err) {
      console.error('Error loading profiles:', err);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      setLoading(true);
      const data = await ChatService.getMessages(conversationId);
      setMessages(data);
    } catch (err) {
      setError('Failed to load messages');
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (content: string, messageType: string): Promise<boolean> => {
    if (!selectedConversation || !user) return false;

    try {
      // Create optimistic message
      const optimisticMessage: ChatMessageType = {
        id: `temp-${Date.now()}`, // Temporary ID
        conversation_id: selectedConversation.id,
        sender_id: user.id,
        content,
        message_type: messageType as any,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sender: {
          id: user.id,
          username: user.username || 'You',
          avatar_url: user.avatar_url
        }
      };

      // Add message immediately to UI (optimistic update)
      setMessages(prev => [...prev, optimisticMessage]);
      
      // Update conversation list and resort
      setConversations(prev => {
        const updatedConversations = prev.map(conv => 
          conv.id === selectedConversation.id 
            ? { ...conv, last_message: optimisticMessage, last_message_at: optimisticMessage.created_at }
            : conv
        );
        
        // Resort conversations by last_message_at (newest first)
        return sortConversations(updatedConversations);
      });

      // Send message through WebSocket
      sendMessage(selectedConversation.id, content, messageType);
      
      // Scroll to bottom
      setTimeout(() => scrollToBottom(), 100);
      
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!selectedConversation || !user) return;

    try {
      // Remove message from local state immediately for better UX
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      
      // Send delete request to server
      const success = await ChatService.deleteMessage(messageId, user.id);
      
      if (!success) {
        // If deletion failed, restore the message
        console.error('Failed to delete message from server');
        // You could show an error toast here
        // For now, we'll just log the error
      } else {
        console.log('Message deleted successfully:', messageId);
      }
      
    } catch (error) {
      console.error('Failed to delete message:', error);
      // Could show an error toast here
    }
  };

  const handleTypingStart = () => {
    if (selectedConversation) {
      startTyping(selectedConversation.id);
    }
  };

  const handleTypingStop = () => {
    if (selectedConversation) {
      stopTyping(selectedConversation.id);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getOtherParticipantName = (conversation: ChatConversation) => {
    if (!user) return 'Unknown User';
    
    const otherId = conversation.participant1_id === user.id 
      ? conversation.participant2_id 
      : conversation.participant1_id;
    
    // Try to find the user in the profiles data
    const otherUser = profiles.find(p => p.id === otherId);
    return otherUser ? otherUser.username : `User ${otherId.slice(0, 8)}`;
  };

  const handleNewConversation = () => {
    setShowNewConversation(true);
  };

  const handleConversationCreated = (conversation: ChatConversation) => {
    // Add the new conversation to the list and resort
    setConversations(prev => {
      const updatedConversations = [conversation, ...prev];
      
      // Resort conversations by last_message_at (newest first)
      return sortConversations(updatedConversations);
    });
    
    // Select the new conversation
    setSelectedConversation(conversation);
    // Hide mobile conversation list to show the chat
    setShowMobileConversationList(false);
    // Close the modal
    setShowNewConversation(false);
  };

  const handleStartChat = () => {
    setShowDemo(false);
    // Focus on conversation list
    setShowMobileConversationList(true);
  };

  const handleBackToConversationList = () => {
    setSelectedConversation(null);
    setShowMobileConversationList(true);
    setMessages([]);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <MessageCircleIcon size={64} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-semibold text-gray-600 mb-2">Please log in to access chat</h2>
          <p className="text-gray-500">You need to be authenticated to use the chat feature.</p>
        </div>
      </div>
    );
  }

  // Show demo if no conversations and not loading
  if (showDemo && conversations.length === 0 && !loading) {
    return <ChatDemo onStartChat={handleStartChat} />;
  }

  return (
    <div className="h-[100dvh] w-full bg-gray-50 pt-16 sm:pt-20">
      <div className="h-[calc(100dvh-4rem)] sm:h-[calc(100dvh-5rem)] w-full flex flex-col sm:flex-row overflow-hidden">
        {/* Conversation List - Desktop */}
        <div className="hidden md:flex w-72 lg:w-80 bg-white border-r border-gray-200 flex-col">
                       <div className="p-4 border-b border-gray-200 bg-gray-50">
               <div className="flex items-center justify-between mb-3">
                 <div className="flex items-center gap-3">
                   <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
                   {unreadCount > 0 && (
                     <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                       {unreadCount}
                     </span>
                   )}
                 </div>
                 <button
                   onClick={handleNewConversation}
                   className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
                   title="New conversation"
                 >
                   <PlusIcon size={20} />
                 </button>
               </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-500">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            

          </div>
          
          <div className="flex-1 overflow-y-auto">
            <ChatConversationList
              conversations={conversations}
              onSelectConversation={setSelectedConversation}
              selectedConversationId={selectedConversation?.id}
              profiles={profiles}
            />
          </div>
        </div>

        {/* Mobile Conversation List */}
        {showMobileConversationList && !selectedConversation && (
          <div className="md:hidden w-full bg-white flex flex-col h-full">
                         <div className="p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
               <div className="flex items-center justify-between mb-3">
                 <div className="flex items-center gap-3">
                   <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
                   {unreadCount > 0 && (
                     <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                       {unreadCount}
                     </span>
                   )}
                 </div>
                 <button
                   onClick={handleNewConversation}
                   className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
                   title="New conversation"
                 >
                   <PlusIcon size={20} />
                 </button>
               </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-500">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              

            </div>
            
            <div className="chat-conversations-container flex-1 overflow-y-auto">
              <ChatConversationList
                conversations={conversations}
                onSelectConversation={(conv) => {
                  setSelectedConversation(conv);
                  setShowMobileConversationList(false);
                }}
                selectedConversationId={selectedConversation ? selectedConversation.id : undefined}
                profiles={profiles}
              />
            </div>
          </div>
        )}

        {/* Chat Area */}
        {selectedConversation && (
          <div className="flex-1 flex flex-col bg-white min-h-[60dvh] md:min-h-0">
            {/* Chat Header */}
            <div className="chat-header p-3 sm:p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <button
                  onClick={handleBackToConversationList}
                  className="chat-back-button md:hidden p-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                >
                  <ArrowLeftIcon size={20} />
                </button>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900 leading-tight truncate">
                    {getOtherParticipantName(selectedConversation)}
                  </h2>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-xs sm:text-sm text-gray-500">
                      {isConnected ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="chat-messages-container flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 space-y-2 sm:space-y-3 md:space-y-4 bg-gray-50">
              {loading ? (
                <div className="chat-loading-state flex items-center justify-center h-64">
                  <div className="chat-loading-spinner animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : error ? (
                <div className="chat-error-state text-center text-red-600 bg-red-50 p-4 rounded-lg mx-2">
                  <p className="font-medium">{error}</p>
                  <button 
                    onClick={() => loadMessages(selectedConversation!.id)}
                    className="chat-error-button mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : messages.length === 0 ? (
                <div className="chat-empty-state text-center text-gray-500 mt-8 mx-2">
                  <MessageCircleIcon size={48} className="chat-empty-state-icon mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
                  <p className="text-sm">Start the conversation by sending a message!</p>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <ChatMessage 
                      key={message.id} 
                      message={message} 
                      profiles={profiles}
                      onDeleteMessage={handleDeleteMessage}
                      canDelete={true}
                    />
                  ))}
                  
                  {/* Typing indicator */}
                  {typingUsers.size > 0 && (
                    <div className="chat-typing-indicator flex justify-start mx-2">
                      <div className="bg-white text-gray-600 px-3 py-2 rounded-lg text-sm border border-gray-200 shadow-sm">
                        {Array.from(typingUsers).join(', ')} typing...
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Chat Input */}
            <div className="flex-shrink-0">
              <ChatInput
                onSendMessage={handleSendMessage}
                onTypingStart={handleTypingStart}
                onTypingStop={handleTypingStop}
                disabled={!isConnected || !isAuthenticated}
                placeholder="Type a message..."
              />
            </div>
          </div>
        )}

        {/* No Conversation Selected - Desktop only */}
        {!selectedConversation && (
          <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50">
            <div className="text-center p-8">
              <MessageCircleIcon size={64} className="mx-auto text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold text-gray-600 mb-2">Select a conversation</h2>
              <p className="text-gray-500 mb-4">Choose a conversation from the list to start chatting</p>
              <button
                onClick={handleNewConversation}
                className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <PlusIcon size={20} className="mr-2" />
                Start New Chat
              </button>
            </div>
          </div>
        )}
      </div>

             {/* New Conversation Modal */}
       <NewConversationModal
         isOpen={showNewConversation}
         onClose={() => setShowNewConversation(false)}
         onConversationCreated={handleConversationCreated}
       />

       {/* Notification Permission Request */}
       <NotificationPermissionRequest />
     </div>
   );
 }; 