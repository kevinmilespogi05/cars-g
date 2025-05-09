import React, { useState } from 'react';
import { ChatList } from '../components/chat/ChatList';
import { ChatRoom } from '../components/chat/ChatRoom';
import { ChatRoom as ChatRoomType } from '../types/chat';
import { ArrowLeft, MessageSquare, Search, Plus } from 'lucide-react';

export const Chat: React.FC = () => {
  const [selectedRoom, setSelectedRoom] = useState<ChatRoomType | null>(null);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState<'chats' | 'search'>('chats');

  // Handle window resize
  React.useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleRoomDelete = () => {
    // Reset selected room when the current room is deleted
    setSelectedRoom(null);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - Hidden on mobile when chat is selected */}
      <div className={`${isMobileView && selectedRoom ? 'hidden' : 'w-80 md:w-80'} flex-shrink-0`}>
        <ChatList
          onSelectRoom={setSelectedRoom}
          selectedRoomId={selectedRoom?.id}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedRoom ? (
          <div className="h-full flex flex-col">
            {/* Mobile Header */}
            <div className="flex-none bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
              <div className="flex items-center px-4 py-3">
                <button
                  onClick={() => setSelectedRoom(null)}
                  className="p-2 -ml-2 rounded-full hover:bg-gray-100 mr-2"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-900" />
                </button>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900">{selectedRoom.name}</h2>
                  <p className="text-sm text-gray-500">Active now</p>
                </div>
              </div>
            </div>
            
            <ChatRoom 
              roomId={selectedRoom.id} 
              roomName={selectedRoom.name}
              onDelete={handleRoomDelete}
            />
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {/* Mobile Header */}
            <div className="flex-none bg-white border-b border-gray-200">
              <div className="flex items-center justify-between px-4 py-3">
                <h2 className="text-xl font-semibold">Messages</h2>
                <button
                  onClick={() => setActiveTab('search')}
                  className="p-2 rounded-full hover:bg-gray-100"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Empty State */}
            <div className="flex-1 flex flex-col items-center justify-center bg-white">
              <div className="text-center p-8">
                <div className="w-16 h-16 bg-primary-color/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-primary-color" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Select a Chat
                </h3>
                <p className="text-gray-500 max-w-md">
                  Choose a conversation from the sidebar or start a new one to begin messaging.
                </p>
              </div>
            </div>

            {/* Mobile Bottom Navigation */}
            {isMobileView && (
              <div className="flex-none bg-white border-t border-gray-200">
                <div className="flex items-center justify-around px-4 py-2">
                  <button
                    onClick={() => setActiveTab('chats')}
                    className={`flex flex-col items-center p-2 ${
                      activeTab === 'chats' ? 'text-primary-color' : 'text-gray-500'
                    }`}
                  >
                    <MessageSquare className="w-6 h-6" />
                    <span className="text-xs mt-1">Chats</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('search')}
                    className={`flex flex-col items-center p-2 ${
                      activeTab === 'search' ? 'text-primary-color' : 'text-gray-500'
                    }`}
                  >
                    <Search className="w-6 h-6" />
                    <span className="text-xs mt-1">Search</span>
                  </button>
                </div>
              </div>
            )}

            {/* Floating Action Button */}
            {isMobileView && (
              <button
                onClick={() => setActiveTab('search')}
                className="fixed bottom-20 right-4 w-14 h-14 bg-primary-color text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-dark transition-colors"
              >
                <Plus className="w-6 h-6" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}; 