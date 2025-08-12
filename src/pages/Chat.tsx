import React, { useState } from 'react';
import { ChatList } from '../components/chat/ChatList';
import { ChatRoom } from '../components/chat/ChatRoom';
import { ChatRoom as ChatRoomType } from '../types/chat';
import { ArrowLeft, MessageSquare, Search, Plus, Users } from 'lucide-react';

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
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Hidden on mobile when chat is selected */}
      <div className={`${
        isMobileView && selectedRoom ? 'hidden' : 'w-full sm:w-80 lg:w-96'
      } flex-shrink-0 border-r border-gray-200`}>
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
            {/* Chat Header - Fixed positioning to account for main navigation */}
            <div className="flex-none bg-white shadow-sm border-b border-gray-200 sticky top-16 sm:top-20 z-40">
              <div className="flex items-center px-4 sm:px-6 py-4">
                <button
                  onClick={() => setSelectedRoom(null)}
                  className="p-2 -ml-2 rounded-full hover:bg-gray-100 mr-3 transition-colors sm:hidden"
                  aria-label="Go back to chat list"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-900" />
                </button>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                    {selectedRoom.name}
                  </h2>
                  <p className="text-sm text-gray-600 flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Active now
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {/* Room actions can be added here */}
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
            {/* Empty State */}
            <div className="flex-1 flex flex-col items-center justify-center bg-white">
              <div className="text-center p-8 max-w-md">
                <div className="w-20 h-20 bg-gradient-to-br from-primary-color to-primary-dark rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageSquare className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Welcome to Chat
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Start a conversation with your team members or create a group chat to collaborate effectively.
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => setActiveTab('search')}
                    className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-primary-color text-white rounded-xl hover:bg-primary-dark transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <Users className="w-5 h-5" />
                    <span className="font-medium">Find People</span>
                  </button>
                  <p className="text-sm text-gray-500">
                    Select a conversation from the sidebar to begin messaging
                  </p>
                </div>
              </div>
            </div>

            {/* Mobile Bottom Navigation */}
            {isMobileView && (
              <div className="flex-none bg-white border-t border-gray-200">
                <div className="flex items-center justify-around px-4 py-3">
                  <button
                    onClick={() => setActiveTab('chats')}
                    className={`flex flex-col items-center p-2 transition-colors ${
                      activeTab === 'chats' ? 'text-primary-color' : 'text-gray-600'
                    }`}
                  >
                    <MessageSquare className="w-6 h-6" />
                    <span className="text-xs mt-1 font-medium">Chats</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('search')}
                    className={`flex flex-col items-center p-2 transition-colors ${
                      activeTab === 'search' ? 'text-primary-color' : 'text-gray-600'
                    }`}
                  >
                    <Search className="w-6 h-6" />
                    <span className="text-xs mt-1 font-medium">Search</span>
                  </button>
                </div>
              </div>
            )}

            {/* Floating Action Button */}
            {isMobileView && (
              <button
                onClick={() => setActiveTab('search')}
                className="fixed bottom-20 right-4 w-14 h-14 bg-primary-color text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-dark transition-all duration-200 hover:shadow-xl"
                aria-label="Start new chat"
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