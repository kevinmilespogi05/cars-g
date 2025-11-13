import React, { useState, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useImageViewerStore } from '../store/imageViewerStore';
import { socketManager } from '../lib/socket';
import { ChatWindow } from './ChatWindow';
import { MoveableChatButton } from './MoveableChatButton';
import { checkAdminStatus } from '../services/adminService';

interface ChatButtonProps {
  adminId?: string;
  className?: string;
  variant?: 'default' | 'icon' | 'full';
}

export const ChatButton: React.FC<ChatButtonProps> = ({ 
  adminId = 'admin', // Default admin ID, should be configured
  className = '',
  variant = 'default'
}) => {
  const { user, isAuthenticated, isAdminLike } = useAuthStore();
  const { isImageViewerOpen } = useImageViewerStore();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAdminOnline, setIsAdminOnline] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [buttonPosition, setButtonPosition] = useState<{ x: number; y: number } | undefined>(undefined);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Check initial admin status
    const checkInitialAdminStatus = async () => {
      try {
        const adminStatus = await checkAdminStatus();
        console.log('Initial admin status check:', adminStatus);
        if (adminStatus.success) {
          setIsAdminOnline(adminStatus.isOnline);
        }
      } catch (error) {
        console.error('Failed to check initial admin status:', error);
      }
    };

    checkInitialAdminStatus();

    // Set up admin online status listener
    const handleAdminOnline = (data: { isOnline: boolean }) => {
      console.log('Admin online status changed via socket:', data);
      setIsAdminOnline(data.isOnline);
    };

    // Set up message received listener for unread count
    const handleMessageReceived = (message: any) => {
      if (message.sender_id !== user.id) {
        setUnreadCount(prev => prev + 1);
      }
    };

    // Set up messages read listener
    const handleMessagesRead = (data: { messageIds: string[] }) => {
      setUnreadCount(0);
    };

    socketManager.onAdminOnline(handleAdminOnline);
    socketManager.onMessageReceived(handleMessageReceived);
    socketManager.onMessagesRead(handleMessagesRead);

    // Poll for admin status every 2 seconds as a fallback
    // More frequent polling to detect admin status changes in sidebar
    const statusPollInterval = setInterval(async () => {
      try {
        const adminStatus = await checkAdminStatus();
        if (adminStatus.success) {
          setIsAdminOnline(adminStatus.isOnline);
        }
      } catch (error) {
        console.error('Admin status polling error:', error);
      }
    }, 2000);

    return () => {
      clearInterval(statusPollInterval);
      socketManager.offAdminOnline(handleAdminOnline);
      socketManager.offMessageReceived(handleMessageReceived);
      socketManager.offMessagesRead(handleMessagesRead);
    };
  }, [isAuthenticated, user]);

  const handleChatClick = () => {
    setIsChatOpen(true);
    setUnreadCount(0); // Clear unread count when opening chat
  };

  const handleChatClose = () => {
    setIsChatOpen(false);
  };

  const handlePositionChange = (position: { x: number; y: number }) => {
    setButtonPosition(position);
  };

  if (!isAuthenticated || !user || isAdminLike() || user.role === 'patrol' || isImageViewerOpen) {
    return null;
  }

  if (variant === 'icon' || variant === 'full') {
    // Sidebar variant - simple button
    return (
      <>
        <button
          onClick={handleChatClick}
          className={`flex items-center px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative group text-white hover:bg-white/10 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-[#800000] ${className}`}
          aria-label="Open chat with administrator"
        >
          <MessageCircle className="h-5 w-5 mr-3" aria-hidden="true" />
          {variant === 'full' && (
            <div className="flex items-center gap-2 flex-1">
              <span>Chat with Admin</span>
              {/* Admin Status Indicator - Green when online, White when offline */}
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors duration-300 ${
                isAdminOnline ? 'bg-green-500' : 'bg-white'
              }`}></div>
            </div>
          )}
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount}
            </div>
          )}
        </button>

        <ChatWindow
          isOpen={isChatOpen}
          onClose={handleChatClose}
          adminId={adminId}
          position={buttonPosition}
          unreadCount={unreadCount}
        />
      </>
    );
  }

  return (
    <>
      {/* Fixed bottom chat button - no longer moveable */}
      <div className="fixed bottom-4 right-4 z-chat">
        <button
          onClick={handleChatClick}
          className={`
            w-12 h-12 min-h-[48px] min-w-[48px] rounded-full shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2
            ${isChatOpen 
              ? 'bg-gray-500 hover:bg-gray-600 focus:ring-gray-500' 
              : 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500'
            }
          `}
          style={{
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.08)'
          }}
          aria-label={isChatOpen ? 'Close chat window' : 'Open chat with administrator'}
          aria-expanded={isChatOpen}
        >
          {isChatOpen ? (
            <X className="w-5 h-5 text-white mx-auto" aria-hidden="true" />
          ) : (
            <MessageCircle className="w-5 h-5 text-white mx-auto" aria-hidden="true" />
          )}
        </button>
        
        {/* Unread count badge */}
        {unreadCount > 0 && !isChatOpen && (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-md animate-pulse border border-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
        
        {/* Online indicator */}
        {isAdminOnline && !isChatOpen && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border border-white rounded-full shadow-sm"></div>
        )}
      </div>

      <ChatWindow
        isOpen={isChatOpen}
        onClose={handleChatClose}
        adminId={adminId}
        position={buttonPosition}
        unreadCount={unreadCount}
      />
    </>
  );
};
