import React, { useEffect, useState } from 'react';
import { ChatRoom } from '../../types/chat';
import { chatService } from '../../services/chatService';
import { UserSearch } from './UserSearch';
import { Plus, Search, MessageSquare, Users, Clock } from 'lucide-react';
import { ChatServiceError } from '../../services/chatService';
import { useAuthStore } from '../../store/authStore';

interface ChatListProps {
  onSelectRoom: (room: ChatRoom) => void;
  selectedRoomId?: string;
  activeTab?: 'chats' | 'search';
  onTabChange?: (tab: 'chats' | 'search') => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  onSelectRoom,
  selectedRoomId,
  activeTab = 'chats',
  onTabChange,
}) => {
  const { user: currentUser } = useAuthStore();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [roomMenuOpen, setRoomMenuOpen] = useState(false);

  useEffect(() => {
    loadRooms();

    // Subscribe to room deletions
    const unsubscribeDeletions = chatService.subscribeToRoomDeletions((roomId, userId) => {
      if (userId === currentUser?.id) {
        setRooms(prevRooms => {
          // Remove the deleted room from the list
          const updatedRooms = prevRooms.filter(room => room.id !== roomId);
          // If the deleted room was selected, clear the selection
          if (selectedRoomId === roomId) {
            onSelectRoom(null as any);
          }
          return updatedRooms;
        });
      }
    });

    // Subscribe to room restorations
    const unsubscribeRestorations = chatService.subscribeToRoomRestorations((roomId, userId) => {
      if (userId === currentUser?.id) {
        // Reload rooms to get the restored room
        loadRooms();
      }
    });

    // Cleanup subscriptions
    return () => {
      unsubscribeDeletions();
      unsubscribeRestorations();
    };
  }, [currentUser?.id, selectedRoomId, onSelectRoom]);

  const loadRooms = async () => {
    try {
      setIsLoading(true);
      
      // First, update direct message room names to ensure they're correct
      try {
        await chatService.updateDirectMessageRoomNames();
      } catch (nameUpdateError) {
        console.warn('Failed to update room names:', nameUpdateError);
        // Continue loading rooms even if name update fails
      }
      
      const loadedRooms = await chatService.getRooms();
      
      // Create a Map to store unique rooms by their ID
      const uniqueRoomsMap = new Map<string, ChatRoom>();
      
      // Filter out admin users if current user is not an admin
      const filteredRooms = loadedRooms.filter((room: ChatRoom) => {
        // Skip if we already have this room
        if (uniqueRoomsMap.has(room.id)) {
          return false;
        }

        // For group chats, check if any participant is an admin
        if (room.isGroup) {
          const hasAdmin = room.participants?.some(p => p.role === 'admin');
          if (currentUser?.role !== 'admin' && hasAdmin) {
            return false;
          }
        } else {
          // For direct chats, check if the other user is an admin
          const otherUser = room.participants?.find(p => p.id !== currentUser?.id);
          if (currentUser?.role !== 'admin' && otherUser?.role === 'admin') {
            return false;
          }
        }

        // Add to map and include in filtered results
        uniqueRoomsMap.set(room.id, room);
        return true;
      });

      // Sort rooms by most recent activity
      const sortedRooms = filteredRooms.sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at);
        const dateB = new Date(b.updated_at || b.created_at);
        return dateB.getTime() - dateA.getTime();
      });

      setRooms(sortedRooms);
    } catch (err) {
      const errorMessage = err instanceof ChatServiceError 
        ? err.message 
        : 'Failed to load chat rooms';
      
      // Check if the error is related to orphaned rooms
      if (errorMessage.includes('missing participants') || errorMessage.includes('orphaned')) {
        console.log('Detected orphaned rooms, attempting cleanup...');
        try {
          await chatService.cleanupOrphanedRooms();
          // Retry loading rooms after cleanup
          const retryRooms = await chatService.getRooms();
          setRooms(retryRooms);
          console.log('Successfully loaded rooms after cleanup');
          return;
        } catch (cleanupError) {
          console.error('Cleanup failed:', cleanupError);
          setError('Failed to fix chat room issues. Please try refreshing the page.');
        }
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    try {
      setIsCreatingRoom(false);
      const newRoom = await chatService.createRoom(newRoomName.trim());
      setNewRoomName('');
      setRooms(prev => [newRoom, ...prev]);
      onSelectRoom(newRoom);
    } catch (err) {
      const errorMessage = err instanceof ChatServiceError 
        ? err.message 
        : 'Failed to create room';
      setError(errorMessage);
    }
  };

  const handleStartConversation = async (userId: string) => {
    try {
      const room = await chatService.createDirectMessageRoom(userId);
      setRooms(prev => [room, ...prev]);
      onSelectRoom(room);
    } catch (err) {
      const errorMessage = err instanceof ChatServiceError 
        ? err.message 
        : 'Failed to start conversation';
      setError(errorMessage);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    try {
      setIsDeleting(true);
      await chatService.deleteRoom(roomId);
      setRooms(prev => prev.filter(room => room.id !== roomId));
      if (selectedRoomId === roomId) {
        onSelectRoom(null as any);
      }
    } catch (err) {
      const errorMessage = err instanceof ChatServiceError 
        ? err.message 
        : 'Failed to delete room';
      setError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestoreRoom = async (roomId: string) => {
    try {
      await chatService.restoreRoom(roomId);
      console.log('Chat room restored successfully');
      // Reload rooms to show the restored room
      await loadRooms();
    } catch (err) {
      const errorMessage = err instanceof ChatServiceError 
        ? err.message 
        : 'Failed to restore chat room';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter rooms based on search query
  const filteredRooms = rooms.filter(room => {
    const searchLower = searchQuery.toLowerCase();
    const roomName = room.name?.toLowerCase() || '';
    
    // Safely access participants and their usernames
    const participantNames = room.participants
      ?.map(p => p.profiles?.username || p.id)
      .filter(Boolean)
      .join(' ') || '';
    
    return roomName.includes(searchLower) || 
           participantNames.includes(searchLower);
  });

  const formatLastUpdated = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="w-full bg-white flex flex-col h-full">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-gray-100">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Messages</h2>
        <div className="relative">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-color focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
          />
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        <button
          className={`flex-1 py-4 text-center transition-colors ${
            activeTab === 'chats'
              ? 'border-b-2 border-primary-color text-primary-color font-semibold'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
          onClick={() => onTabChange?.('chats')}
        >
          <div className="flex items-center justify-center space-x-2">
            <MessageSquare className="w-5 h-5" />
            <span className="hidden sm:inline">Chats</span>
          </div>
        </button>
        <button
          className={`flex-1 py-4 text-center transition-colors ${
            activeTab === 'search'
              ? 'border-b-2 border-primary-color text-primary-color font-semibold'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
          onClick={() => onTabChange?.('search')}
        >
          <div className="flex items-center justify-center space-x-2">
            <Users className="w-5 h-5" />
            <span className="hidden sm:inline">Find Users</span>
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'chats' ? (
          <>
            {/* Create Room Button */}
            <div className="p-4 sm:p-6 border-b border-gray-100">
              {!isCreatingRoom ? (
                <button
                  onClick={() => setIsCreatingRoom(true)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-primary-color text-white rounded-xl hover:bg-primary-dark transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">Create New Room</span>
                </button>
              ) : (
                <form onSubmit={handleCreateRoom} className="space-y-3">
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="Enter room name..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-color focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
                    autoFocus
                  />
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      className="flex-1 px-4 py-3 bg-primary-color text-white rounded-xl hover:bg-primary-dark transition-colors font-medium"
                    >
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreatingRoom(false)}
                      className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Room List */}
            <div className="divide-y divide-gray-100">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-color mx-auto"></div>
                  <p className="mt-2 text-gray-500">Loading conversations...</p>
                </div>
              ) : filteredRooms.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No conversations yet</p>
                  <p className="text-sm text-gray-400 mt-1">Start a new chat to begin messaging</p>
                </div>
              ) : (
                filteredRooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => onSelectRoom(room)}
                    className={`w-full p-4 sm:p-6 text-left transition-all duration-200 hover:bg-gray-50 ${
                      selectedRoomId === room.id
                        ? 'bg-primary-color/5 border-r-4 border-primary-color'
                        : ''
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                        room.is_direct_message 
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                          : 'bg-gradient-to-br from-purple-500 to-purple-600'
                      }`}>
                        <span className="text-white font-bold text-lg">
                          {room.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {room.name}
                          </h3>
                          <div className="flex items-center space-x-1 text-gray-400">
                            <Clock className="w-4 h-4" />
                            <span className="text-xs">
                              {formatLastUpdated(room.updated_at || room.created_at)}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {room.is_direct_message ? 'Direct message' : 'Group chat'}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          <UserSearch onStartConversation={handleStartConversation} />
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border-t border-red-200">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}; 