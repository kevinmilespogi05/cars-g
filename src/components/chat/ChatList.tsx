import React, { useEffect, useState } from 'react';
import { ChatRoom } from '../../types/chat';
import { chatService } from '../../services/chatService';
import { UserSearch } from './UserSearch';

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

  return (
    <div className="w-64 bg-white rounded-lg shadow-lg">
      <div className="flex border-b">
        <button
          className={`flex-1 py-3 text-center ${
            activeTab === 'rooms'
              ? 'border-b-2 border-blue-500 text-blue-500'
              : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('rooms')}
        >
          Rooms
        </button>
        <button
          className={`flex-1 py-3 text-center ${
            activeTab === 'search'
              ? 'border-b-2 border-blue-500 text-blue-500'
              : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('search')}
        >
          Find Users
        </button>
      </div>

      {activeTab === 'rooms' ? (
        <>
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold">Chat Rooms</h2>
            {!isCreatingRoom ? (
              <button
                onClick={() => setIsCreatingRoom(true)}
                className="mt-2 w-full px-4 py-2 text-sm bg-blue-500 text-white rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Create New Room
              </button>
            ) : (
              <form onSubmit={handleCreateRoom} className="mt-2">
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Room name..."
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <div className="mt-2 flex space-x-2">
                  <button
                    type="submit"
                    className="flex-1 px-3 py-1 text-sm bg-blue-500 text-white rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingRoom(false)}
                    className="flex-1 px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => onSelectRoom(room)}
                className={`w-full p-4 text-left border-b hover:bg-gray-50 transition-colors ${
                  selectedRoomId === room.id ? 'bg-blue-50' : ''
                }`}
              >
                <h3 className="font-medium">{room.name}</h3>
                <p className="text-sm text-gray-500">
                  Last updated: {new Date(room.updated_at).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        </>
      ) : (
        <UserSearch onStartConversation={handleStartConversation} />
      )}
    </div>
  );
}; 