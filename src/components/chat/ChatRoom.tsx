import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '../../types/chat';
import { chatService } from '../../services/chatService';
import { useAuth } from '../../hooks/useAuth';
import { MoreVertical, Bell, BellOff, UserX, Trash, X } from 'lucide-react';

interface ChatRoomProps {
  roomId: string;
  roomName: string;
  onDelete?: () => void;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({ roomId, roomName, onDelete }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [roomMenuOpen, setRoomMenuOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // Load initial messages
    loadMessages();
    checkMuteStatus();
    loadBlockedUsers();

    // Subscribe to new messages
    console.log(`Setting up subscription for room: ${roomId}`);
    const unsubscribe = chatService.subscribeToMessages(roomId, (message) => {
      console.log('Received new message:', message);
      setMessages((prev) => [...prev, message]);
    });

    setIsSubscribed(true);

    return () => {
      console.log(`Cleaning up subscription for room: ${roomId}`);
      unsubscribe();
      setIsSubscribed(false);
    };
  }, [roomId]);

  const loadMessages = async () => {
    try {
      const loadedMessages = await chatService.getMessages(roomId);
      setMessages(loadedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const checkMuteStatus = async () => {
    try {
      const mutedRooms = await chatService.getMutedRooms();
      setIsMuted(mutedRooms.includes(roomId));
    } catch (error) {
      console.error('Error checking mute status:', error);
    }
  };

  const loadBlockedUsers = async () => {
    try {
      const blocked = await chatService.getBlockedUsers();
      setBlockedUsers(blocked);
    } catch (error) {
      console.error('Error loading blocked users:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    try {
      const sentMessage = await chatService.sendMessage(roomId, newMessage);
      console.log('Message sent:', sentMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const success = await chatService.deleteMessage(messageId);
      if (success) {
        setMessages(messages.filter(msg => msg.id !== messageId));
        console.log('Message deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    } finally {
      setActionMenuOpen(null);
    }
  };

  const handleBlockUser = async (userId: string) => {
    try {
      await chatService.blockUser(userId);
      setBlockedUsers([...blockedUsers, userId]);
      // Filter out messages from the newly blocked user
      setMessages(messages.filter(msg => msg.sender_id !== userId));
      console.log('User blocked successfully');
    } catch (error) {
      console.error('Error blocking user:', error);
    } finally {
      setActionMenuOpen(null);
    }
  };

  const handleMuteRoom = async () => {
    try {
      if (isMuted) {
        await chatService.unmuteRoom(roomId);
        setIsMuted(false);
        console.log('Room unmuted successfully');
      } else {
        await chatService.muteRoom(roomId);
        setIsMuted(true);
        console.log('Room muted successfully');
      }
    } catch (error) {
      console.error('Error changing room mute status:', error);
    } finally {
      setRoomMenuOpen(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!window.confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const success = await chatService.deleteRoom(roomId);
      if (success) {
        console.log('Chat room deleted successfully');
        onDelete?.();
      }
    } catch (error) {
      console.error('Error deleting chat room:', error);
    } finally {
      setIsDeleting(false);
      setRoomMenuOpen(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      <div className="p-4 border-b flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">{roomName}</h2>
          {isSubscribed ? (
            <span className="text-xs text-green-500">Connected</span>
          ) : (
            <span className="text-xs text-red-500">Disconnected</span>
          )}
        </div>
        <div className="relative">
          <button 
            onClick={() => setRoomMenuOpen(!roomMenuOpen)}
            className="p-2 rounded-full hover:bg-gray-100"
            disabled={isDeleting}
          >
            <MoreVertical size={20} />
          </button>
          {roomMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
              <div className="py-1">
                <button 
                  onClick={handleMuteRoom}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                >
                  {isMuted ? (
                    <>
                      <Bell size={16} className="mr-2" />
                      Unmute Room
                    </>
                  ) : (
                    <>
                      <BellOff size={16} className="mr-2" />
                      Mute Room
                    </>
                  )}
                </button>
                <button 
                  onClick={handleDeleteRoom}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center text-red-500"
                  disabled={isDeleting}
                >
                  <Trash size={16} className="mr-2" />
                  {isDeleting ? 'Deleting...' : 'Delete Chat'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender_id === user?.id ? 'justify-end' : 'justify-start'
            }`}
          >
            <div className="relative group">
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  message.sender_id === user?.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <p>{message.content}</p>
                <span className="text-xs opacity-75">
                  {new Date(message.created_at).toLocaleTimeString()}
                </span>
              </div>
              
              <div className="absolute top-0 right-0 -mt-2 -mr-2 opacity-0 group-hover:opacity-100">
                <button 
                  onClick={() => setActionMenuOpen(actionMenuOpen === message.id ? null : message.id)}
                  className="p-1 rounded-full bg-white shadow-md hover:bg-gray-100"
                >
                  <MoreVertical size={14} />
                </button>
                
                {actionMenuOpen === message.id && (
                  <div className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg z-10 border">
                    <div className="py-1">
                      {message.sender_id === user?.id && (
                        <button 
                          onClick={() => handleDeleteMessage(message.id)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center text-red-500"
                        >
                          <Trash size={14} className="mr-2" />
                          Delete
                        </button>
                      )}
                      {message.sender_id !== user?.id && !blockedUsers.includes(message.sender_id) && (
                        <button 
                          onClick={() => handleBlockUser(message.sender_id)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                        >
                          <UserX size={14} className="mr-2" />
                          Block User
                        </button>
                      )}
                      <button 
                        onClick={() => setActionMenuOpen(null)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                      >
                        <X size={14} className="mr-2" />
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}; 