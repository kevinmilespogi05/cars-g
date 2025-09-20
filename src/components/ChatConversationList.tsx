import React from 'react';
import { ChatConversation, ChatUser } from '../types';
import { useAuthStore } from '../store/authStore';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircleIcon } from 'lucide-react';

interface ChatConversationListProps {
  conversations: ChatConversation[];
  onSelectConversation: (conversation: ChatConversation) => void;
  selectedConversationId?: string;
  profiles?: any[];
}

export const ChatConversationList: React.FC<ChatConversationListProps> = ({
  conversations,
  onSelectConversation,
  selectedConversationId,
  profiles = [],
}) => {
  const { user } = useAuthStore();

  const getOtherParticipant = (conversation: ChatConversation): ChatUser | null => {
    if (!user) return null;
    
    const otherId = conversation.participant1_id === user.id 
      ? conversation.participant2_id 
      : conversation.participant1_id;
    
    // First try to find the user in the conversation's participants array
    const participantInConversation = conversation.participants?.find(p => p.id === otherId);
    if (participantInConversation) {
      return {
        id: participantInConversation.id,
        username: participantInConversation.username,
        avatar_url: participantInConversation.avatar_url,
        is_banned: participantInConversation.is_banned,
      };
    }
    
    // Fallback to profiles array if participants not available
    const otherUser = profiles.find(p => p.id === otherId);
    
    return {
      id: otherId,
      username: otherUser ? otherUser.username : `User ${otherId.slice(0, 8)}`,
      avatar_url: otherUser ? otherUser.avatar_url : null,
      is_banned: otherUser ? otherUser.is_banned : false,
    };
  };

  const isOtherParticipantBanned = (conversation: ChatConversation): boolean => {
    if (!user) return false;
    
    const otherId = conversation.participant1_id === user.id 
      ? conversation.participant2_id 
      : conversation.participant1_id;
    
    // First check in conversation's participants array
    const participantInConversation = conversation.participants?.find(p => p.id === otherId);
    if (participantInConversation) {
      return participantInConversation.is_banned === true;
    }
    
    // Fallback to profiles array
    const otherUser = profiles.find(p => p.id === otherId);
    return otherUser ? otherUser.is_banned === true : false;
  };

  const formatLastMessageTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };





  if (conversations.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        <div className="text-6xl mb-4">💬</div>
        <h3 className="text-lg font-semibold mb-2 text-gray-700">No conversations yet</h3>
        <p className="text-sm mb-4">Start chatting with other users to see conversations here.</p>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4 space-y-2">
      {conversations.map((conversation) => {
        const otherUser = getOtherParticipant(conversation);
        const isSelected = selectedConversationId === conversation.id;
        
        return (
          <div
            key={conversation.id}
            onClick={() => onSelectConversation(conversation)}
            className={`
              p-3 sm:p-4 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md touch-manipulation
              ${isSelected 
                ? 'bg-blue-500 text-white shadow-lg' 
                : 'bg-white border border-gray-200 hover:border-gray-300'
              }
            `}
          >
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {otherUser?.avatar_url ? (
                  <img
                    src={otherUser.avatar_url}
                    alt={otherUser.username}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-2 ${
                    isSelected ? 'border-white/30' : 'border-gray-200'
                  }`}>
                    <span className={`font-semibold text-base sm:text-lg ${
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
                  <div className="flex items-center space-x-2">
                    <h4 className={`font-semibold text-sm sm:text-base ${
                      isSelected ? 'text-white' : 'text-gray-900'
                    }`} style={{ wordBreak: 'break-word' }}>
                      {otherUser?.username || 'Unknown User'}
                    </h4>
                    {isOtherParticipantBanned(conversation) && (
                      <svg className={`w-4 h-4 ${isSelected ? 'text-red-200' : 'text-red-500'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-xs ${
                    isSelected ? 'text-white/80' : 'text-gray-500'
                  }`}>
                    {formatLastMessageTime(conversation.last_message_at)}
                  </span>
                </div>
                
                {conversation.last_message && (
                  <p className={`text-sm mt-1 ${
                    isSelected ? 'text-white/80' : 'text-gray-600'
                  }`} style={{ wordBreak: 'break-word' }}>
                    {conversation.last_message.content}
                  </p>
                )}

                {/* Unread indicator and banned user indicator */}
                <div className="flex items-center justify-between mt-2">
                  {/* Unread count */}
                  {conversation.unread_count > 0 && (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      isSelected 
                        ? 'bg-white/20 text-white' 
                        : 'bg-blue-100 text-blue-600'
                    }`}>
                      {conversation.unread_count} unread message{conversation.unread_count !== 1 ? 's' : ''}
                    </span>
                  )}
                  
                  {/* Banned user indicator */}
                  {isOtherParticipantBanned(conversation) && (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      isSelected 
                        ? 'bg-red-500/20 text-red-200' 
                        : 'bg-red-100 text-red-600'
                    }`}>
                      Banned User
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}; 