import React, { useState, useEffect } from 'react';
import { ChatRoom } from '../../types/chat';
import { WebSocketChatList } from './WebSocketChatList';
import { WebSocketChatRoom } from './WebSocketChatRoom';
import { websocketChatService } from '../../services/websocketChatService';
import { useAuthStore } from '../../store/authStore';
import { MessageSquare, Wifi, WifiOff, AlertCircle, Menu, X, Users, Sparkles, MessageCircle, Zap, Shield, RefreshCw, WifiIcon } from 'lucide-react';
import { MobileChatOptimizer, useDeviceInfo } from './MobileChatOptimizer';

export const WebSocketChat: React.FC = () => {
  const { user } = useAuthStore();
  const { isMobile } = useDeviceInfo();
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [showConnectionError, setShowConnectionError] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Initialize WebSocket connection when user is authenticated
    websocketChatService.connect();

    // Setup connection status monitoring
    const unsubscribeConnection = websocketChatService.onConnectionStatus((status) => {
      setConnectionStatus(status as 'connected' | 'connecting' | 'disconnected');
      setShowConnectionError(status === 'disconnected');
      if (status === 'connected') {
        setConnectionError(null);
        setIsReconnecting(false);
      }
    });

    const unsubscribeError = websocketChatService.onError((error) => {
      console.error('WebSocket error:', error);
      setShowConnectionError(true);
      setConnectionError(error);
    });

    return () => {
      unsubscribeConnection();
      unsubscribeError();
      websocketChatService.destroy();
    };
  }, [user]);

  const handleRoomSelect = (room: ChatRoom) => {
    setSelectedRoom(room);
    // Close sidebar on mobile after room selection
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const handleRoomDelete = () => {
    setSelectedRoom(null);
  };

  const handleReconnect = async () => {
    setIsReconnecting(true);
    try {
      await websocketChatService.connect();
    } catch (error) {
      console.error('Reconnection failed:', error);
      setConnectionError('Reconnection failed. Please try again.');
    } finally {
      setIsReconnecting(false);
    }
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="w-5 h-5 text-emerald-500" />;
      case 'connecting':
        return <Wifi className="w-5 h-5 text-amber-500 animate-pulse" />;
      case 'disconnected':
        return <WifiOff className="w-5 h-5 text-red-500" />;
      default:
        return <WifiOff className="w-5 h-5 text-gray-500" />;
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-emerald-600 dark:text-emerald-400';
      case 'connecting':
        return 'text-amber-600 dark:text-amber-400';
      case 'disconnected':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (!user) {
    return (
      <MobileChatOptimizer>
        <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-blue-900/20 dark:to-indigo-900/20 min-h-screen">
          <div className="text-center max-w-lg w-full">
            {/* Enhanced Hero Section */}
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-3xl blur-3xl"></div>
              <div className="relative w-24 h-24 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
                <MessageSquare className="w-12 h-12 text-white" />
              </div>
            </div>
            
            <h3 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 dark:from-white dark:via-blue-100 dark:to-indigo-100 bg-clip-text text-transparent mb-4">
              Welcome to CARS-G Chat
            </h3>
            
            <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 leading-relaxed max-w-md mx-auto">
              Connect with fellow car enthusiasts in real-time. Share experiences, get advice, and build your automotive community.
            </p>
            
            {/* Enhanced Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto">
              <div className="group bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/20 dark:border-slate-700/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Real-time Chat</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">Instant messaging with zero delays</p>
              </div>
              
              <div className="group bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/20 dark:border-slate-700/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Community</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">Join group chats & direct messages</p>
              </div>
              
              <div className="group bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/20 dark:border-slate-700/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Lightning Fast</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">Optimized for speed & reliability</p>
              </div>
            </div>
            
            {/* Enhanced Security Badge */}
            <div className="inline-flex items-center space-x-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-full px-4 py-2 text-emerald-700 dark:text-emerald-300">
              <Shield className="w-4 h-4" />
              <span className="text-sm font-medium">Secure & Private</span>
            </div>
          </div>
        </div>
      </MobileChatOptimizer>
    );
  }

  return (
    <MobileChatOptimizer>
      <div className="chat-container">
        {/* Enhanced Mobile Sidebar Toggle */}
        <div className="lg:hidden fixed top-20 left-4 z-20">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="mobile-nav-toggle touch-button bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-xl border border-white/20 dark:border-slate-700/50 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:bg-white dark:hover:bg-slate-800"
            aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Enhanced Connection Status Indicator for Mobile */}
        <div className="lg:hidden fixed top-20 right-4 z-20">
          <div className={`flex items-center space-x-2 px-3 py-2 rounded-full text-xs font-medium shadow-lg backdrop-blur-sm ${
            connectionStatus === 'connected' 
              ? 'bg-emerald-100/90 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 connection-status-connected' 
              : connectionStatus === 'connecting'
              ? 'bg-amber-100/90 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 connection-status-connecting'
              : 'bg-red-100/90 dark:bg-red-900/50 text-red-700 dark:text-red-300 connection-status-disconnected'
          }`}>
            {getConnectionStatusIcon()}
            <span className="capitalize">{connectionStatus}</span>
          </div>
        </div>

        {/* Enhanced Chat List - Responsive Sidebar */}
        <div className={`
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          chat-sidebar-container
          transition-all duration-300 ease-in-out
          lg:transition-none
          chat-sidebar
          ${isSidebarOpen ? 'shadow-2xl' : ''}
          chat-room-enter
        `}>
          <WebSocketChatList
            onRoomSelect={handleRoomSelect}
            selectedRoomId={selectedRoom?.id}
          />
        </div>

        {/* Enhanced Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="mobile-overlay lg:hidden backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Enhanced Chat Room - Responsive Layout */}
        <div className="chat-main-content">
          {selectedRoom ? (
            <WebSocketChatRoom
              roomId={selectedRoom.id}
              roomName={selectedRoom.name || 'Unnamed Room'}
              onDelete={handleRoomDelete}
              onBack={() => setIsSidebarOpen(true)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 dark:from-slate-900 dark:via-blue-900/10 dark:to-indigo-900/10">
              <div className="text-center max-w-2xl w-full">
                {/* Enhanced Hero Icon */}
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-3xl blur-3xl"></div>
                  <div className="relative w-28 h-28 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
                    <MessageSquare className="w-14 h-14 text-white" />
                  </div>
                </div>
                
                <h3 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 dark:from-white dark:via-blue-100 dark:to-indigo-100 bg-clip-text text-transparent mb-4">
                  Select a Chat Room
                </h3>
                
                <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 leading-relaxed max-w-lg mx-auto">
                  Choose a room from the list to start chatting with other users. Create new conversations or join existing ones.
                </p>
                
                {/* Enhanced Connection Status */}
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 dark:border-slate-700/50 mb-8 max-w-md mx-auto">
                  <div className="flex items-center justify-center space-x-3 mb-4">
                    {getConnectionStatusIcon()}
                    <span className={`text-base font-semibold capitalize ${getConnectionStatusColor()}`}>
                      {connectionStatus}
                    </span>
                  </div>
                  
                  {showConnectionError && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center space-x-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl border border-red-200 dark:border-red-800">
                        <AlertCircle className="w-5 h-5" />
                        <span className="text-sm font-medium">
                          {connectionError || 'Connection lost. Trying to reconnect...'}
                        </span>
                      </div>
                      
                      {/* Enhanced Reconnect Button */}
                      <button
                        onClick={handleReconnect}
                        disabled={isReconnecting}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:via-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 touch-manipulation shadow-lg hover:shadow-xl transform hover:scale-105 hover:-translate-y-1 disabled:transform-none font-semibold"
                      >
                        {isReconnecting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Reconnecting...</span>
                          </>
                        ) : (
                          <>
                            <WifiIcon className="w-4 h-4" />
                            <span>Reconnect</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Enhanced Features Highlight */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 max-w-3xl mx-auto">
                  <div className="group bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 dark:border-slate-700/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 text-center">Group Chats</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 text-center">Join community discussions</p>
                  </div>
                  
                  <div className="group bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 dark:border-slate-700/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                      <MessageCircle className="w-8 h-8 text-white" />
                    </div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 text-center">Direct Messages</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 text-center">Private conversations</p>
                  </div>
                  
                  <div className="group bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 dark:border-slate-700/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Zap className="w-8 h-8 text-white" />
                    </div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 text-center">Real-time</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 text-center">Instant message delivery</p>
                  </div>
                </div>

                {/* Enhanced Mobile hint */}
                <div className="lg:hidden bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6 max-w-md mx-auto">
                  <div className="flex items-center justify-center space-x-3 text-blue-600 dark:text-blue-400 mb-3">
                    <Menu className="w-5 h-5" />
                    <span className="text-base font-semibold">Mobile Navigation</span>
                  </div>
                  <p className="text-blue-600 dark:text-blue-400 text-center leading-relaxed">
                    Tap the menu button to see available chats and start conversations
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MobileChatOptimizer>
  );
}; 