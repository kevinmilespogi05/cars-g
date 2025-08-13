import React, { useEffect, useState } from 'react';
import { ChatRoom } from '../../types/chat';
import { chatService } from '../../services/chatService';
import { websocketChatService } from '../../services/websocketChatService';
import { useAuthStore } from '../../store/authStore';
import { 
  MessageSquare, 
  Plus, 
  Search, 
  Users, 
  MoreVertical, 
  Trash, 
  Edit,
  Wifi,
  WifiOff,
  AlertCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface WebSocketChatListProps {
  onRoomSelect: (room: ChatRoom) => void;
  selectedRoomId?: string;
}

export const WebSocketChatList: React.FC<WebSocketChatListProps> = ({ 
  onRoomSelect, 
  selectedRoomId 
}) => {
  const { user } = useAuthStore();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [showConnectionError, setShowConnectionError] = useState(false);

  useEffect(() => {
    const initializeChatList = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Load rooms
        const loadedRooms = await chatService.getRooms();
        setRooms(loadedRooms);
        
        // Setup WebSocket connection status monitoring
        const unsubscribeConnection = websocketChatService.onConnectionStatus((status) => {
          setConnectionStatus(status as 'connected' | 'connecting' | 'disconnected');
          setShowConnectionError(status === 'disconnected');
        });

        const unsubscribeError = websocketChatService.onError((error) => {
          setError(error);
          setShowConnectionError(true);
        });

        return () => {
          unsubscribeConnection();
          unsubscribeError();
        };
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load chat rooms');
      } finally {
        setIsLoading(false);
      }
    };

    initializeChatList();
  }, []);

  const handleCreateRoom = async () => {
    if (!newRoomName.trim() || !user) return;

    setIsCreatingRoom(true);
    try {
      const newRoom = await chatService.createRoom(newRoomName.trim());
      setRooms(prev => [newRoom, ...prev]);
      setNewRoomName('');
      setShowCreateRoom(false);
      onRoomSelect(newRoom);
    } catch (error) {
      console.error('Failed to create room:', error);
      setError('Failed to create room');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    try {
      await chatService.deleteRoom(roomId);
      setRooms(prev => prev.filter(room => room.id !== roomId));
    } catch (error) {
      console.error('Failed to delete room:', error);
      setError('Failed to delete room');
    }
  };

  const handleDirectMessage = async (otherUserId: string) => {
    try {
      const existingRoom = rooms.find(room => 
        room.chat_participants?.length === 2 && 
        room.chat_participants.some(p => p.user_id === otherUserId) &&
        room.chat_participants.some(p => p.user_id === user?.id)
      );

      if (existingRoom) {
        onRoomSelect(existingRoom);
        return;
      }

      const newRoom = await chatService.createDirectMessageRoom(otherUserId);
      setRooms(prev => [newRoom, ...prev]);
      onRoomSelect(newRoom);
    } catch (error) {
      console.error('Failed to create direct message:', error);
      setError('Failed to create direct message');
    }
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'connecting':
        return <Wifi className="w-4 h-4 text-yellow-500 animate-pulse" />;
      case 'disconnected':
        return <WifiOff className="w-4 h-4 text-red-500" />;
      default:
        return <WifiOff className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoomDisplayName = (room: ChatRoom) => {
    if (room.name) return room.name;
    
    // For direct messages, show the other user's name
    if (room.chat_participants && room.chat_participants.length === 2) {
      const otherParticipant = room.chat_participants.find(p => p.user_id !== user?.id);
      return otherParticipant?.profiles?.username || 'Unknown User';
    }
    
    return 'Unnamed Room';
  };

  const getLastMessage = (room: ChatRoom) => {
    if (!room.last_message) return 'No messages yet';
    
    const sender = room.last_message.sender_id === user?.id ? 'You' : 
      room.chat_participants?.find(p => p.user_id === room.last_message.sender_id)?.profiles?.username || 'Unknown User';
    
    return `${sender}: ${room.last_message.content}`;
  };

  const filteredRooms = rooms.filter(room => {
    const roomName = getRoomDisplayName(room).toLowerCase();
    const lastMessage = getLastMessage(room).toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    return roomName.includes(searchLower) || lastMessage.includes(searchLower);
  });

  if (isLoading) {
    return (
      <div className="w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
            {getConnectionStatusIcon()}
            <span>Chats</span>
          </h2>
          
          <button
            onClick={() => setShowCreateRoom(true)}
            className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {showConnectionError && (
          <div className="flex items-center space-x-2 text-red-500 text-sm mb-3">
            <AlertCircle className="w-4 h-4" />
            <span>Connection lost</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-3">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          />
        </div>

        {/* Create Room Modal */}
        {showCreateRoom && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Create New Chat Room
              </h3>
              
              <input
                type="text"
                placeholder="Room name..."
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white mb-4"
                onKeyPress={(e) => e.key === 'Enter' && handleCreateRoom()}
              />
              
              <div className="flex space-x-2">
                <button
                  onClick={handleCreateRoom}
                  disabled={!newRoomName.trim() || isCreatingRoom}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCreatingRoom ? 'Creating...' : 'Create'}
                </button>
                
                <button
                  onClick={() => {
                    setShowCreateRoom(false);
                    setNewRoomName('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Room List */}
      <div className="flex-1 overflow-y-auto">
        {filteredRooms.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            {searchTerm ? 'No chats found' : 'No chats yet'}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredRooms.map((room) => (
              <div
                key={room.id}
                onClick={() => onRoomSelect(room)}
                className={`p-4 cursor-pointer transition-colors ${
                  selectedRoomId === room.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="w-4 h-4 text-gray-400" />
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {getRoomDisplayName(room)}
                      </h3>
                    </div>
                    
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                      {getLastMessage(room)}
                    </p>
                    
                    {room.last_message && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(room.last_message.created_at), { addSuffix: true })}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-1">
                    {room.chat_participants && room.chat_participants.length > 2 && (
                      <div className="flex items-center space-x-1 text-xs text-gray-400">
                        <Users className="w-3 h-3" />
                        <span>{room.chat_participants.length}</span>
                      </div>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRoom(room.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}; 