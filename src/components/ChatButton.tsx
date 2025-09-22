import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { socketManager } from '../lib/socket';
import { ChatWindow } from './ChatWindow';
import { MoveableChatButton } from './MoveableChatButton';
import { checkAdminStatus } from '../services/adminService';

interface ChatButtonProps {
  adminId?: string;
  className?: string;
}

export const ChatButton: React.FC<ChatButtonProps> = ({ 
  adminId = 'admin', // Default admin ID, should be configured
  className = ''
}) => {
  const { user, isAuthenticated } = useAuthStore();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAdminOnline, setIsAdminOnline] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [buttonPosition, setButtonPosition] = useState<{ x: number; y: number } | undefined>(undefined);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Check initial admin status
    const checkInitialAdminStatus = async () => {
      const adminStatus = await checkAdminStatus();
      if (adminStatus.success) {
        setIsAdminOnline(adminStatus.isOnline);
      }
    };

    checkInitialAdminStatus();

    // Set up admin online status listener
    const handleAdminOnline = (data: { isOnline: boolean }) => {
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

    return () => {
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

  if (!isAuthenticated || !user || user.role === 'admin' || user.role === 'patrol') {
    return null;
  }

  return (
    <>
      <MoveableChatButton
        isOpen={isChatOpen}
        onClick={handleChatClick}
        unreadCount={unreadCount}
        isOnline={isAdminOnline}
        onPositionChange={handlePositionChange}
      />

      <ChatWindow
        isOpen={isChatOpen}
        onClose={handleChatClose}
        adminId={adminId}
        position={buttonPosition}
      />
    </>
  );
};
