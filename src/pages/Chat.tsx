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
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-80 flex-shrink-0">
        <ChatList
          onSelectRoom={setSelectedRoom}
          selectedRoomId={selectedRoom?.id}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4">
        {selectedRoom ? (
          <ChatRoom 
            roomId={selectedRoom.id} 
            roomName={selectedRoom.name}
            onDelete={handleRoomDelete}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center bg-white rounded-lg shadow-lg">
            <div className="text-center p-8">
              <div className="w-16 h-16 bg-primary-color/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-primary-color"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Select a Chat
              </h3>
              <p className="text-gray-500 max-w-md">
                Choose a conversation from the sidebar or start a new one to begin messaging.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 