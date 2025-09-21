import React from 'react';
import { MessageCircle, X } from 'lucide-react';

interface FloatingChatButtonProps {
  isOpen: boolean;
  onClick: () => void;
  unreadCount?: number;
  isOnline?: boolean;
}

export const FloatingChatButton: React.FC<FloatingChatButtonProps> = ({
  isOpen,
  onClick,
  unreadCount = 0,
  isOnline = false
}) => {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Unread count badge */}
      {unreadCount > 0 && !isOpen && (
        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full w-7 h-7 flex items-center justify-center font-bold shadow-lg animate-pulse border-2 border-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </div>
      )}
      
      {/* Online indicator */}
      {isOnline && !isOpen && (
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full shadow-lg"></div>
      )}
      
      {/* Chat button */}
      <button
        onClick={onClick}
        className={`
          w-16 h-16 rounded-2xl shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95
          ${isOpen 
            ? 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700' 
            : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
          }
        `}
        style={{
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)'
        }}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white mx-auto" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white mx-auto" />
        )}
      </button>
    </div>
  );
};
