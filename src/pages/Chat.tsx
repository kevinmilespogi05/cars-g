import React, { useState } from 'react';
import { ChatList } from '../components/chat/ChatList';
import { ChatRoom } from '../components/chat/ChatRoom';
import { ChatRoom as ChatRoomType } from '../types/chat';

export const Chat: React.FC = () => {
  const [selectedRoom, setSelectedRoom] = useState<ChatRoomType | null>(null);

  const handleRoomDelete = () => {
    // Reset selected room when the current room is deleted
    setSelectedRoom(null);
  };

  return (
    <div className="flex h-screen bg-gray-100 p-4 space-x-4">
      <ChatList
        onSelectRoom={setSelectedRoom}
        selectedRoomId={selectedRoom?.id}
      />
      <div className="flex-1">
        {selectedRoom ? (
          <ChatRoom 
            roomId={selectedRoom.id} 
            roomName={selectedRoom.name}
            onDelete={handleRoomDelete}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-white rounded-lg shadow-lg">
            <p className="text-gray-500">Select a chat room to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}; 