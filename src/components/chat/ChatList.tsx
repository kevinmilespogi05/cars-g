import React, { useEffect, useState } from 'react';
import { ChatRoom } from '../../types/chat';
import { chatService } from '../../services/chatService';
import { UserSearch } from './UserSearch';
import { Plus, Search, MessageSquare } from 'lucide-react';
import { ChatServiceError } from '../../services/chatService';
import { useAuthStore } from '../../store/authStore';

interface ChatListProps {
  onSelectRoom: (room: ChatRoom) => void;
  selectedRoomId?: string;
}

export const ChatList: React.FC<ChatListProps> = ({
  onSelectRoom,
  selectedRoomId,
}) => {
  const { user: currentUser } = useAuthStore();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [activeTab, setActiveTab] = useState<'rooms' | 'search'>('rooms');
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
      setError(null);
    } catch (error) {
      console.error('Error loading rooms:', error);
      setError('Failed to load chats');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    try {
      setIsLoading(true);
      const newRoom = await chatService.createRoom(newRoomName);
      if (newRoom) {
        setRooms((prev) => [newRoom, ...prev]);
        setNewRoomName('');
        setIsCreatingRoom(false);
      }
    } catch (error) {
      console.error('Error creating room:', error);
      setError('Failed to create chat room');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartConversation = async (userId: string, username: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if conversation already exists
      const existingRoom = rooms.find(room => 
        room.is_direct_message && 
        room.participants?.some(p => p.id === userId)
      );

      if (existingRoom) {
        onSelectRoom(existingRoom);
        setActiveTab('rooms');
        return;
      }

      const room = await chatService.createDirectMessageRoom(userId);
      if (room) {
        // Remove any existing duplicates first
        setRooms(prev => {
          const filtered = prev.filter(r => 
            !(r.is_direct_message && r.participants?.some(p => p.id === userId))
          );
          return [room, ...filtered];
        });
        onSelectRoom(room);
        setActiveTab('rooms');
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      setError('Failed to start conversation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!window.confirm('Are you sure you want to delete this chat? This will only remove it from your view.')) {
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);
      const success = await chatService.deleteRoom(roomId);
      if (success) {
        // The real-time subscription will handle updating the UI
        console.log('Chat room deleted successfully');
      }
    } catch (err) {
      const errorMessage = err instanceof ChatServiceError 
        ? err.message 
        : 'Failed to delete chat room';
      setError(errorMessage);
    } finally {
      setIsDeleting(false);
      setRoomMenuOpen(false);
    }
  };

  const handleRestoreRoom = async (roomId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const success = await chatService.restoreRoom(roomId);
      if (success) {
        console.log('Chat room restored successfully');
        // Reload rooms to show the restored room
        await loadRooms();
      }
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
    const participantNames = room.participants
      ?.map(p => p.username?.toLowerCase())
      .filter(Boolean)
      .join(' ');
    
    return roomName.includes(searchLower) || 
           participantNames?.includes(searchLower);
  });

  return (
    <div className="w-full bg-white rounded-lg shadow-lg flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Messages</h2>
        <div className="mt-4 relative">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-color focus:border-transparent"
          />
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          className={`flex-1 py-4 text-center ${
            activeTab === 'rooms'
              ? 'border-b-2 border-primary-color text-primary-color'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('rooms')}
        >
          <div className="flex items-center justify-center space-x-2">
            <MessageSquare className="w-5 h-5" />
            <span>Chats</span>
          </div>
        </button>
        <button
          className={`flex-1 py-4 text-center ${
            activeTab === 'search'
              ? 'border-b-2 border-primary-color text-primary-color'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('search')}
        >
          <div className="flex items-center justify-center space-x-2">
            <Search className="w-5 h-5" />
            <span>Find Users</span>
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'rooms' ? (
          <>
            {/* Create Room Button */}
            <div className="p-4 border-b border-gray-200">
              {!isCreatingRoom ? (
                <button
                  onClick={() => setIsCreatingRoom(true)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-primary-color text-white rounded-full hover:bg-primary-dark transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span>Create New Room</span>
                </button>
              ) : (
                <form onSubmit={handleCreateRoom} className="space-y-2">
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="Room name..."
                    className="w-full px-4 py-3 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-color focus:border-transparent"
                    autoFocus
                  />
                  <div className="flex space-x-2">
                    <button
                      type="submit"
                      className="flex-1 px-4 py-3 bg-primary-color text-white rounded-full hover:bg-primary-dark transition-colors"
                    >
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreatingRoom(false)}
                      className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Room List */}
            <div className="divide-y divide-gray-200">
              {filteredRooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => onSelectRoom(room)}
                  className={`w-full p-4 text-left transition-colors ${
                    selectedRoomId === room.id
                      ? 'bg-primary-color/10'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-primary-color/10 flex items-center justify-center">
                      <span className="text-primary-color font-bold text-lg">
                        {room.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {room.name}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">
                        Last updated: {new Date(room.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <UserSearch onStartConversation={handleStartConversation} />
        )}
      </div>
    </div>
  );
}; 