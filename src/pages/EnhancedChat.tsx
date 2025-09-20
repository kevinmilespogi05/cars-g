import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useEnhancedChat } from '../contexts/EnhancedChatContext';
import { ChatConversationList } from '../components/ChatConversationList';
import { ChatMessage } from '../components/ChatMessage';
import { ChatInput } from '../components/ChatInput';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { RealTimePerformanceMonitor } from '../components/RealTimePerformanceMonitor';
import { NewConversationModal } from '../components/NewConversationModal';
import { NotificationPermissionRequest } from '../components/NotificationPermissionRequest';
import { 
  ArrowLeftIcon, 
  MessageCircleIcon, 
  PlusIcon, 
  SearchIcon,
  WifiIcon, 
  WifiOffIcon,
  AlertCircleIcon,
  RefreshCwIcon,
  XIcon
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import '../components/ChatMobile.css';

export const EnhancedChat: React.FC = () => {
  const { user } = useAuthStore();
  const { state, actions, socket } = useEnhancedChat();
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showMobileConversationList, setShowMobileConversationList] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [state.messages]);

  // Handle mobile state when conversation is selected/deselected
  useEffect(() => {
    if (state.selectedConversation && window.innerWidth < 768) {
      setShowMobileConversationList(false);
    } else if (!state.selectedConversation && window.innerWidth < 768) {
      setShowMobileConversationList(true);
    }
  }, [state.selectedConversation]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setShowMobileConversationList(false);
      } else if (!state.selectedConversation) {
        setShowMobileConversationList(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [state.selectedConversation]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleSendMessage = useCallback(async (content: string, messageType: string): Promise<boolean> => {
    if (!state.selectedConversation) return false;
    
    const success = await actions.sendMessage(content, messageType);
    
    if (success) {
      setTimeout(() => scrollToBottom(), 100);
    }
    
    return success;
  }, [state.selectedConversation, actions, scrollToBottom]);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    await actions.deleteMessage(messageId);
  }, [actions]);

  const handleTypingStart = useCallback(() => {
    if (state.selectedConversation) {
      socket.startTyping(state.selectedConversation.id);
    }
  }, [state.selectedConversation, socket]);

  const handleTypingStop = useCallback(() => {
    if (state.selectedConversation) {
      socket.stopTyping(state.selectedConversation.id);
    }
  }, [state.selectedConversation, socket]);

  const handleNewConversation = useCallback(() => {
    setShowNewConversation(true);
  }, []);

  const handleConversationCreated = useCallback((conversation: any) => {
    actions.selectConversation(conversation);
    setShowMobileConversationList(false);
    setShowNewConversation(false);
  }, [actions]);

  const handleBackToConversationList = useCallback(() => {
    actions.selectConversation(null);
    setShowMobileConversationList(true);
  }, [actions]);

  const handleSearch = useCallback((query: string) => {
    setSearchInput(query);
    actions.searchConversations(query);
  }, [actions]);

  const handleClearSearch = useCallback(() => {
    setSearchInput('');
    actions.clearSearch();
  }, [actions]);

  const getOtherParticipantName = useCallback((conversation: any) => {
    if (!user || !conversation?.participants) return 'Unknown User';
    
    const otherParticipant = conversation.participants.find(
      (p: any) => p.id !== user.id
    );
    
    return otherParticipant?.username || 'Unknown User';
  }, [user]);

  const isOtherParticipantBanned = useCallback((conversation: any): boolean => {
    if (!user || !conversation?.participants) return false;
    
    const otherParticipant = conversation.participants.find(
      (p: any) => p.id !== user.id
    );
    
    return otherParticipant?.is_banned === true;
  }, [user]);

  const getConnectionStatusIcon = () => {
    if (!socket.isConnected) {
      return <WifiOffIcon size={16} className="text-red-500" />;
    }
    
    switch (socket.connectionQuality) {
      case 'excellent':
        return <WifiIcon size={16} className="text-green-500" />;
      case 'good':
        return <WifiIcon size={16} className="text-yellow-500" />;
      case 'poor':
        return <WifiIcon size={16} className="text-red-500" />;
      default:
        return <WifiIcon size={16} className="text-gray-500" />;
    }
  };

  const getConnectionStatusText = () => {
    if (!socket.isConnected) return 'Disconnected';
    if (!socket.isAuthenticated) return 'Connecting...';
    
    switch (socket.connectionQuality) {
      case 'excellent':
        return 'Real-time';
      case 'good':
        return 'Good';
      case 'poor':
        return 'Poor';
      default:
        return 'Connected';
    }
  };

  if (!user || user.role === 'patrol') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <MessageCircleIcon size={64} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-semibold text-gray-600 mb-2">Chat Unavailable</h2>
          <p className="text-gray-500">
            {!user ? 'You need to be authenticated to use the chat feature.' : 'Patrol accounts cannot access chat.'}
          </p>
        </div>
      </div>
    );
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
                {state.unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {state.unreadCount}
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
            
            {/* Search Bar */}
            <div className="relative">
              <SearchIcon size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchInput}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              {searchInput && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <XIcon size={16} />
                </button>
              )}
            </div>
            
            {/* Enhanced Connection Status */}
            <div className="mt-3">
              <ConnectionStatus
                isConnected={socket.isConnected}
                isAuthenticated={socket.isAuthenticated}
                connectionQuality={socket.connectionQuality}
                onRetry={actions.retryConnection}
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <ChatConversationList
              conversations={state.filteredConversations}
              onSelectConversation={actions.selectConversation}
              selectedConversationId={state.selectedConversation?.id}
              profiles={[]} // Will be populated from conversation participants
            />
          </div>
        </div>

        {/* Mobile Conversation List */}
        {showMobileConversationList && !state.selectedConversation && (
          <div className="md:hidden w-full bg-white flex flex-col h-full">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
                  {state.unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      {state.unreadCount}
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
              
              {/* Search Bar */}
              <div className="relative">
                <SearchIcon size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchInput}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                {searchInput && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <XIcon size={16} />
                  </button>
                )}
              </div>
              
              {/* Enhanced Connection Status */}
              <div className="mt-3">
                <ConnectionStatus
                  isConnected={socket.isConnected}
                  isAuthenticated={socket.isAuthenticated}
                  connectionQuality={socket.connectionQuality}
                  onRetry={actions.retryConnection}
                />
              </div>
            </div>
            
            <div className="chat-conversations-container flex-1 overflow-y-auto">
              <ChatConversationList
                conversations={state.filteredConversations}
                onSelectConversation={(conv) => {
                  actions.selectConversation(conv);
                  setShowMobileConversationList(false);
                }}
                selectedConversationId={state.selectedConversation?.id}
                profiles={[]}
              />
            </div>
          </div>
        )}

        {/* Chat Area */}
        {state.selectedConversation && (
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
                    {getOtherParticipantName(state.selectedConversation)}
                  </h2>
                  <div className="flex items-center gap-2">
                    {isOtherParticipantBanned(state.selectedConversation) ? (
                      <>
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span className="text-xs sm:text-sm text-red-600 font-medium">
                          Banned User
                        </span>
                      </>
                    ) : (
                      <ConnectionStatus
                        isConnected={socket.isConnected}
                        isAuthenticated={socket.isAuthenticated}
                        connectionQuality={socket.connectionQuality}
                        className="text-xs sm:text-sm"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="chat-messages-container flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 space-y-2 sm:space-y-3 md:space-y-4 bg-gray-50">
              {state.loading ? (
                <div className="chat-loading-state flex items-center justify-center h-64">
                  <div className="chat-loading-spinner animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : state.error ? (
                <div className="chat-error-state text-center text-red-600 bg-red-50 p-4 rounded-lg mx-2">
                  <div className="flex items-center justify-center mb-2">
                    <AlertCircleIcon size={24} className="mr-2" />
                    <p className="font-medium">{state.error}</p>
                  </div>
                  <div className="flex gap-2 justify-center">
                    <button 
                      onClick={() => actions.loadMessages(state.selectedConversation!.id)}
                      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    >
                      Retry
                    </button>
                    <button 
                      onClick={actions.clearError}
                      className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ) : state.messages.length === 0 ? (
                <div className="chat-empty-state text-center text-gray-500 mt-8 mx-2">
                  <MessageCircleIcon size={48} className="chat-empty-state-icon mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
                  <p className="text-sm">Start the conversation by sending a message!</p>
                </div>
              ) : (
                <>
                  {state.messages.map((message) => (
                    <ChatMessage 
                      key={message.id} 
                      message={message} 
                      profiles={state.selectedConversation?.participants || []}
                      onDeleteMessage={handleDeleteMessage}
                      canDelete={true}
                    />
                  ))}
                  
                  {/* Typing indicator */}
                  {state.typingUsers.size > 0 && (
                    <div className="chat-typing-indicator flex justify-start mx-2">
                      <div className="bg-white text-gray-600 px-3 py-2 rounded-lg text-sm border border-gray-200 shadow-sm">
                        {Array.from(state.typingUsers).join(', ')} typing...
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Chat Input or Banned User Message */}
            <div className="flex-shrink-0">
              {isOtherParticipantBanned(state.selectedConversation) ? (
                <div className="bg-red-50 border-t border-red-200 p-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2 text-red-700 mb-2">
                      <AlertCircleIcon size={20} />
                      <span className="font-medium">User is Banned</span>
                    </div>
                    <p className="text-sm text-red-600">
                      You cannot send messages to this user as they have been banned from the platform. 
                      You can still view the conversation history, but new messages cannot be sent.
                    </p>
                  </div>
                </div>
              ) : (
                <ChatInput
                  onSendMessage={handleSendMessage}
                  onTypingStart={handleTypingStart}
                  onTypingStop={handleTypingStop}
                  disabled={!socket.isConnected || !socket.isAuthenticated}
                  placeholder="Type a message..."
                />
              )}
            </div>
          </div>
        )}

        {/* No Conversation Selected - Desktop only */}
        {!state.selectedConversation && (
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

      {/* Real-time Performance Monitor */}
      <RealTimePerformanceMonitor isVisible={user?.role === 'admin'} />
    </div>
  );
};
