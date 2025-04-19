import React, { useEffect, useState } from 'react';
import { ChatRoom } from '../../types/chat';
import { chatService } from '../../services/chatService';
import { UserSearch } from './UserSearch';
import { Plus, Search, MessageSquare } from 'lucide-react';
import { ChatServiceError } from '../../services/chatService';

interface ChatListProps {
  onSelectRoom: (room: ChatRoom) => void;
  selectedRoomId?: string;
}

export const ChatList: React.FC<ChatListProps> = ({
  onSelectRoom,
  selectedRoomId,
}) => {
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
  }, []);

  const loadRooms = async () => {
    try {
      const loadedRooms = await chatService.getRooms();
      setRooms(loadedRooms);
    } catch (error) {
      console.error('Error loading rooms:', error);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    try {
      const newRoom = await chatService.createRoom(newRoomName);
      if (newRoom) {
        setRooms((prev) => [newRoom, ...prev]);
        setNewRoomName('');
        setIsCreatingRoom(false);
      }
    } catch (error) {
      console.error('Error creating room:', error);
    }
  };

  const handleStartConversation = async (userId: string, username: string) => {
    try {
      const room = await chatService.createDirectMessageRoom(userId);
      if (room) {
        setRooms((prev) => [room, ...prev]);
        onSelectRoom(room);
        setActiveTab('rooms');
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
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
        console.log('Chat room deleted successfully');
        // Remove the room from the local state
        setRooms(prev => prev.filter(room => room.id !== roomId));
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

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-80 bg-white rounded-lg shadow-lg flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Messages</h2>
        <div className="mt-4 relative">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-color focus:border-transparent"
          />
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          className={`flex-1 py-3 text-center ${
            activeTab === 'rooms'
              ? 'border-b-2 border-primary-color text-primary-color'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('rooms')}
        >
          <div className="flex items-center justify-center space-x-2">
            <MessageSquare className="w-4 h-4" />
            <span>Chats</span>
          </div>
        </button>
        <button
          className={`flex-1 py-3 text-center ${
            activeTab === 'search'
              ? 'border-b-2 border-primary-color text-primary-color'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('search')}
        >
          <div className="flex items-center justify-center space-x-2">
            <Search className="w-4 h-4" />
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
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-primary-color text-white rounded-full hover:bg-primary-dark transition-colors"
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
                    className="w-full px-4 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-color focus:border-transparent"
                    autoFocus
                  />
                  <div className="flex space-x-2">
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-primary-color text-white rounded-full hover:bg-primary-dark transition-colors"
                    >
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreatingRoom(false)}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors"
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
                    <div className="w-10 h-10 rounded-full bg-primary-color/10 flex items-center justify-center">
                      <span className="text-primary-color font-bold">
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