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
  AlertCircle,
  X,
  Hash,
  User,
  Clock
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

  const getRoomIcon = (room: ChatRoom) => {
    if (room.name) {
      return <Hash className="w-4 h-4 text-blue-500" />;
    }
    return <User className="w-4 h-4 text-green-500" />;
  };

  const filteredRooms = rooms.filter(room => {
    const roomName = getRoomDisplayName(room).toLowerCase();
    const lastMessage = getLastMessage(room).toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    return roomName.includes(searchLower) || lastMessage.includes(searchLower);
  });

  if (isLoading) {
    return (
      <div className="w-full lg:w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex items-center justify-center min-h-[200px]">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-3">Loading chats...</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
            Fetching your chat rooms and conversations
          </p>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-slate-400 dark:text-slate-500 text-xs">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse loading-dot"></div>
              <span>Loading chat rooms</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-400 dark:text-slate-500 text-xs">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse loading-dot" style={{ animationDelay: '0.2s' }}></div>
              <span>Fetching recent messages</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-400 dark:text-slate-500 text-xs">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse loading-dot" style={{ animationDelay: '0.4s' }}></div>
              <span>Setting up notifications</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-r border-white/20 dark:border-slate-700/50 shadow-xl w-full">
      {/* Enhanced Header */}
      <div className="p-6 border-b border-white/20 dark:border-slate-700/50 bg-gradient-to-r from-slate-50/50 to-blue-50/50 dark:from-slate-800/50 dark:to-blue-900/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-blue-800 dark:from-slate-200 dark:to-blue-200 bg-clip-text text-transparent">
              Chats
              <span className="ml-2 inline-flex items-center justify-center w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold rounded-full">
                {filteredRooms.length}
              </span>
            </h2>
          </div>
          
          <button
            onClick={() => setShowCreateRoom(true)}
            className="p-3 rounded-2xl bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 text-white hover:from-blue-600 hover:via-indigo-700 hover:to-purple-700 transition-all duration-300 touch-manipulation shadow-lg hover:shadow-xl transform hover:scale-105 hover:-translate-y-1"
            aria-label="Create new chat room"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Enhanced Connection Status Display */}
        <div className="mb-4">
          <div className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-xl text-sm font-medium shadow-lg backdrop-blur-sm ${
            connectionStatus === 'connected' 
              ? 'bg-emerald-100/90 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 connection-status-connected' 
              : connectionStatus === 'connecting'
              ? 'bg-amber-100/90 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 connection-status-connecting'
              : 'bg-red-100/90 dark:bg-red-900/30 text-red-700 dark:text-red-300 connection-status-disconnected'
          }`}>
            {getConnectionStatusIcon()}
            <span className="font-medium capitalize">{connectionStatus}</span>
          </div>
        </div>

        {showConnectionError && (
          <div className="flex items-center space-x-3 text-red-600 dark:text-red-400 text-sm mb-4 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl border border-red-200 dark:border-red-800">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">Connection lost</span>
            <button
              onClick={() => websocketChatService.connect()}
              className="ml-auto px-3 py-1 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 rounded-lg text-xs font-medium hover:bg-red-200 dark:hover:bg-red-700 transition-colors duration-200"
            >
              Retry
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-600 dark:text-red-400 text-sm font-medium mb-2">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-3 py-1 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 rounded-lg text-xs font-medium hover:bg-red-200 dark:hover:bg-red-700 transition-colors duration-200"
                >
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 border border-slate-300 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white text-base transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm"
          />
        </div>
      </div>

      {/* Enhanced Create Room Modal */}
      {showCreateRoom && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 w-full max-w-md shadow-2xl border border-white/20 dark:border-slate-700/50 transform transition-all duration-300 scale-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Create New Chat Room
              </h3>
              <button
                onClick={() => {
                  setShowCreateRoom(false);
                  setNewRoomName('');
                }}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <input
              type="text"
              placeholder="Room name..."
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              className="w-full px-4 py-4 border border-slate-300 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white mb-6 text-base transition-all duration-300 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm"
              onKeyPress={(e) => e.key === 'Enter' && handleCreateRoom()}
              autoFocus
            />
            
            <div className="flex space-x-3">
              <button
                onClick={handleCreateRoom}
                disabled={!newRoomName.trim() || isCreatingRoom}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 text-white rounded-2xl hover:from-blue-600 hover:via-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 touch-manipulation shadow-lg hover:shadow-xl transform hover:scale-105 hover:-translate-y-1 disabled:transform-none font-semibold"
              >
                {isCreatingRoom ? 'Creating...' : 'Create Room'}
              </button>
              
              <button
                onClick={() => {
                  setShowCreateRoom(false);
                  setNewRoomName('');
                }}
                className="flex-1 px-6 py-4 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-2xl hover:bg-slate-300 dark:hover:bg-slate-500 transition-all duration-300 touch-manipulation font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Room List */}
      <div className="flex-1 overflow-y-auto p-4 chat-scrollbar">
        {filteredRooms.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">
            <div className="w-20 h-20 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <MessageSquare className="w-10 h-10 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-3">
              {searchTerm ? 'No chats found' : 'No chats yet'}
            </h3>
            {!searchTerm ? (
              <div className="space-y-4">
                <p className="text-slate-400 dark:text-slate-500 text-sm leading-relaxed">
                  Start building your automotive community by creating your first chat room!
                </p>
                
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 max-w-sm mx-auto">
                  <div className="flex items-center space-x-3 text-blue-600 dark:text-blue-400 mb-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-semibold">Getting Started</span>
                  </div>
                  <ul className="text-blue-700 dark:text-blue-300 text-xs space-y-2 text-left">
                    <li className="flex items-start space-x-2">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                      <span>Create a group chat for car enthusiasts</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                      <span>Start a discussion about specific car models</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                      <span>Share maintenance tips and tricks</span>
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 dark:text-slate-500 text-sm">
                Try adjusting your search terms or create a new chat room.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRooms.map((room) => {
              const isSelected = selectedRoomId === room.id;
              const isDirectMessage = !room.name && room.chat_participants?.length === 2;
              
              return (
                <div
                  key={room.id}
                  onClick={() => onRoomSelect(room)}
                  className={`p-4 cursor-pointer transition-all duration-300 rounded-2xl touch-manipulation group chat-list-item ${
                    isSelected
                      ? 'bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-900/30 dark:to-indigo-900/30 border-2 border-blue-200 dark:border-blue-600 shadow-lg'
                      : 'hover:bg-slate-50/80 dark:hover:bg-slate-700/50 active:bg-slate-100/80 dark:active:bg-slate-600/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    {/* Enhanced Room Icon */}
                    <div className="flex-shrink-0 mt-1">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                        isDirectMessage 
                          ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' 
                          : 'bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-600'
                      }`}>
                        {getRoomIcon(room)}
                      </div>
                    </div>

                    {/* Enhanced Room Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white truncate">
                          {getRoomDisplayName(room)}
                        </h3>
                        
                        {/* Enhanced Online indicator for direct messages */}
                        {isDirectMessage && (
                          <div className="flex items-center space-x-2">
                            <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full flex-shrink-0 animate-pulse"></div>
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Online</span>
                          </div>
                        )}
                      </div>
                      
                      <p className="text-sm text-slate-600 dark:text-slate-400 truncate mb-2 leading-relaxed">
                        {getLastMessage(room)}
                      </p>
                      
                      {/* Enhanced metadata */}
                      <div className="flex items-center justify-between">
                        {room.last_message ? (
                          <div className="flex items-center space-x-2 text-xs text-slate-400 dark:text-slate-500">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="font-medium">{formatDistanceToNow(new Date(room.last_message.created_at), { addSuffix: true })}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">New chat</span>
                        )}
                        
                        {/* Enhanced participant count for group chats */}
                        {room.chat_participants && room.chat_participants.length > 2 && (
                          <div className="flex items-center space-x-2 text-xs text-slate-400 dark:text-slate-500">
                            <Users className="w-3.5 h-3.5" />
                            <span className="font-medium">{room.chat_participants.length} members</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Enhanced Action Buttons */}
                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRoom(room.id);
                        }}
                        className="p-2 text-slate-400 hover:text-red-500 transition-all duration-200 touch-manipulation rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 hover:scale-110"
                        aria-label="Delete chat room"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}; 