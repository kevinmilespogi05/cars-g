import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatConversationList } from '../components/ChatConversationList';
import { ChatMessage } from '../components/ChatMessage';
import { ChatInput } from '../components/ChatInput';
import { ChatDemo } from '../components/ChatDemo';
import { NewConversationModal } from '../components/NewConversationModal';
import { ChatConversation, ChatMessage as ChatMessageType } from '../types';
import { ChatService } from '../services/chatService';
import { useChatSocket } from '../hooks/useChatSocket';
import { useAuthStore } from '../store/authStore';
import { ArrowLeftIcon, MessageCircleIcon, PlusIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';

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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showMobileConversationList, setShowMobileConversationList] = useState(true);

  // Define handlers before using them in the hook
  const handleNewMessage = useCallback((message: ChatMessageType) => {
    setMessages(prev => [...prev, message]);
    
    // Update conversation in list with new message
    setConversations(prev => 
      prev.map(conv => 
        conv.id === message.conversation_id 
          ? { ...conv, last_message: message, last_message_at: message.created_at }
          : conv
      )
    );
  }, []);

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

  // WebSocket hook
  const {
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
    onAuthenticated: () => console.log('Chat authenticated'),
    onAuthError: (error) => console.error('Chat auth error:', error),
  });

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
    }
  }, [selectedConversation, joinConversation]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cleanup when leaving conversation
  useEffect(() => {
    return () => {
      if (selectedConversation) {
        leaveConversation(selectedConversation.id);
      }
    };
  }, [selectedConversation, leaveConversation]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await ChatService.getConversations(user!.id);
      setConversations(data);
      
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
    if (!selectedConversation) return false;

    try {
      sendMessage(selectedConversation.id, content, messageType);
      return true; // Assume success for now, could be enhanced with actual confirmation
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
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
    // Add the new conversation to the list
    setConversations(prev => [conversation, ...prev]);
    // Select the new conversation
    setSelectedConversation(conversation);
    // Close the modal
    setShowNewConversation(false);
  };

  const handleStartChat = () => {
    setShowDemo(false);
    // Focus on conversation list
    setShowMobileConversationList(true);
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
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto h-[calc(100vh-5rem)] flex bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Conversation List - Desktop */}
        <div className="hidden md:block w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
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
        {showMobileConversationList && (
          <div className="md:hidden w-full bg-white flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
                <button
                  onClick={handleNewConversation}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
                  title="New conversation"
                >
                  <PlusIcon size={20} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <ChatConversationList
                conversations={conversations}
                onSelectConversation={(conv) => {
                  setSelectedConversation(conv);
                  setShowMobileConversationList(false);
                }}
                selectedConversationId={selectedConversation?.id}
                profiles={profiles}
              />
            </div>
          </div>
        )}

        {/* Chat Area */}
        {selectedConversation && (
          <div className="flex-1 flex flex-col bg-white">
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center space-x-3">
              <button
                onClick={() => setShowMobileConversationList(true)}
                className="md:hidden p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ArrowLeftIcon size={20} />
              </button>
              
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900">
                  {getOtherParticipantName(selectedConversation)}
                </h2>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm text-gray-500">
                    {isConnected ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : error ? (
                <div className="text-center text-red-600 bg-red-50 p-4 rounded-lg">
                  <p className="font-medium">{error}</p>
                  <button 
                    onClick={() => loadMessages(selectedConversation.id)}
                    className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  <MessageCircleIcon size={48} className="mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
                  <p className="text-sm">Start the conversation by sending a message!</p>
                </div>
              ) : (
                                 <>
                   {messages.map((message) => (
                     <ChatMessage key={message.id} message={message} profiles={profiles} />
                   ))}
                  
                  {/* Typing indicator */}
                  {typingUsers.size > 0 && (
                    <div className="flex justify-start">
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
            <ChatInput
              onSendMessage={handleSendMessage}
              onTypingStart={handleTypingStart}
              onTypingStop={handleTypingStop}
              disabled={!isConnected || !isAuthenticated}
              placeholder="Type a message..."
            />
          </div>
        )}

        {/* No Conversation Selected */}
        {!selectedConversation && !showMobileConversationList && (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
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
    </div>
  );
}; 