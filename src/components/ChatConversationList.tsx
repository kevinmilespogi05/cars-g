import React, { useState, useEffect } from 'react';
import { ChatConversation, ChatUser } from '../types';
import { ChatService } from '../services/chatService';
import { useAuthStore } from '../store/authStore';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircleIcon, PlusIcon } from 'lucide-react';

interface ChatConversationListProps {
  onSelectConversation: (conversation: ChatConversation) => void;
  selectedConversationId?: string;
}

export const ChatConversationList: React.FC<ChatConversationListProps> = ({
  onSelectConversation,
  selectedConversationId,
}) => {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const fetchConversations = async () => {
      try {
        setLoading(true);
        const data = await ChatService.getConversations(user.id);
        setConversations(data);
      } catch (err) {
        setError('Failed to load conversations');
        console.error('Error fetching conversations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [user?.id]);

  const getOtherParticipant = (conversation: ChatConversation): ChatUser | null => {
    if (!user) return null;
    
    const otherId = conversation.participant1_id === user.id 
      ? conversation.participant2_id 
      : conversation.participant1_id;
    
    // For now, we'll use a placeholder. In a real app, you'd fetch user details
    return {
      id: otherId,
      username: `User ${otherId.slice(0, 8)}`,
      avatar_url: null,
    };
  };

  const formatLastMessageTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };

  const handleNewConversation = () => {
    // In a real app, you'd show a user selection modal
    alert('New conversation feature coming soon! Select a user to start chatting.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4">
        <div className="text-red-600 mb-3">
          <p className="font-medium">{error}</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        <div className="text-6xl mb-4">💬</div>
        <h3 className="text-lg font-semibold mb-2 text-gray-700">No conversations yet</h3>
        <p className="text-sm mb-4">Start chatting with other users to see conversations here.</p>
        <button
          onClick={handleNewConversation}
          className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <PlusIcon size={16} className="mr-2" />
          Start New Chat
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      {conversations.map((conversation) => {
        const otherUser = getOtherParticipant(conversation);
        const isSelected = selectedConversationId === conversation.id;
        
        return (
          <div
            key={conversation.id}
            onClick={() => onSelectConversation(conversation)}
            className={`
              p-4 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md
              ${isSelected 
                ? 'bg-blue-500 text-white shadow-lg' 
                : 'bg-white border border-gray-200 hover:border-gray-300'
              }
            `}
          >
            <div className="flex items-center space-x-3">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {otherUser?.avatar_url ? (
                  <img
                    src={otherUser.avatar_url}
                    alt={otherUser.username}
                    className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                    isSelected ? 'border-white/30' : 'border-gray-200'
                  }`}>
                    <span className={`font-semibold text-lg ${
                      isSelected ? 'text-white' : 'text-gray-600'
                    }`}>
                      {otherUser?.username?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
              </div>

              {/* Conversation Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className={`font-semibold truncate ${
                    isSelected ? 'text-white' : 'text-gray-900'
                  }`}>
                    {otherUser?.username || 'Unknown User'}
                  </h4>
                  <span className={`text-xs ${
                    isSelected ? 'text-white/80' : 'text-gray-500'
                  }`}>
                    {formatLastMessageTime(conversation.last_message_at)}
                  </span>
                </div>
                
                {conversation.last_message && (
                  <p className={`text-sm truncate mt-1 ${
                    isSelected ? 'text-white/80' : 'text-gray-600'
                  }`}>
                    {conversation.last_message.content}
                  </p>
                )}

                {/* Unread indicator */}
                {conversation.unread_count && conversation.unread_count > 0 && (
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      isSelected 
                        ? 'bg-white/20 text-white' 
                        : 'bg-blue-100 text-blue-600'
                    }`}>
                      {conversation.unread_count} unread message{conversation.unread_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}; 