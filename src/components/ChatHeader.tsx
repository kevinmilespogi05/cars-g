import React from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { useSidebarContext } from '../contexts/SidebarContext';

interface ChatHeaderProps {
  onClose: () => void;
  isConnected: boolean;
  isAdminOnline: boolean;
  isLoading: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onEnlarge?: () => void;
  onMinimize?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  onClose,
  isConnected: _isConnected,
  isAdminOnline,
  isLoading,
  isExpanded = false,
  onToggleExpand,
  onEnlarge,
  onMinimize
}) => {
  // Sidebar context for responsive design (can be used for future enhancements)
  useSidebarContext();
  
  // Sidebar color matching
  const sidebarBg = '#800000'; // Dark red matching sidebar
  const headerGradient = `linear-gradient(to right, ${sidebarBg}dd, ${sidebarBg}99)`;
  
  return (
    <div 
      className="flex items-center justify-between p-4 border-b border-gray-200/60 backdrop-blur-sm transition-colors duration-300"
      style={{
        background: headerGradient
      }}
    >
      <div className="flex items-center space-x-3">
        {/* Admin avatar */}
        <div className="relative">
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-white text-lg font-bold">A</span>
          </div>
          {/* Admin Status Indicator - Green when online, White when offline */}
          <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-3 border-white rounded-full shadow-sm transition-colors duration-300 ${
            isAdminOnline ? 'bg-green-500 animate-pulse' : 'bg-white'
          }`}></div>
        </div>
        
        <div className="flex flex-col">
          <span className="text-base font-bold text-white">
            Admin Support
          </span>
          <div className="flex items-center space-x-2">
            <div className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
              isLoading ? 'bg-yellow-300 animate-pulse' : 
              isAdminOnline ? 'bg-green-400' : 'bg-white'
            }`} />
            <span className={`text-sm font-medium transition-colors duration-300 ${
              isLoading ? 'text-yellow-100' : 
              isAdminOnline ? 'text-green-100' : 'text-white'
            }`}>
              {isLoading ? 'Connecting...' : 
               isAdminOnline ? 'Active now' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-1">
        {/* Enlarge button */}
        {onEnlarge && (
          <button
            onClick={onEnlarge}
            className="p-2 hover:bg-white/20 rounded-full transition-all duration-200 hover:scale-105"
            aria-label="Enlarge chat"
          >
            <Maximize2 className="w-4 h-4 text-white" />
          </button>
        )}

        {/* Minimize button */}
        {onMinimize && (
          <button
            onClick={onMinimize}
            className="p-2 hover:bg-white/20 rounded-full transition-all duration-200 hover:scale-105"
            aria-label="Minimize chat"
          >
            <Minimize2 className="w-4 h-4 text-white" />
          </button>
        )}

        {/* Fallback toggle button for backward compatibility */}
        {onToggleExpand && !onEnlarge && !onMinimize && (
          <button
            onClick={onToggleExpand}
            className="p-2 hover:bg-white/20 rounded-full transition-all duration-200 hover:scale-105"
            aria-label={isExpanded ? "Collapse chat" : "Expand chat"}
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4 text-white" />
            ) : (
              <Maximize2 className="w-4 h-4 text-white" />
            )}
          </button>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="p-2 hover:bg-red-600 rounded-full transition-all duration-200 hover:scale-105"
          aria-label="Close chat"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
};
