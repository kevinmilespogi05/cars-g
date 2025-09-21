import React from 'react';
import { X, Wifi, WifiOff, Loader2, Maximize2, Minimize2 } from 'lucide-react';

interface ChatHeaderProps {
  onClose: () => void;
  isConnected: boolean;
  isAdminOnline: boolean;
  isLoading: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  onClose,
  isConnected,
  isAdminOnline,
  isLoading,
  isExpanded = false,
  onToggleExpand
}) => {
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200/60 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 backdrop-blur-sm">
      <div className="flex items-center space-x-3">
        {/* Admin avatar */}
        <div className="relative">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-white text-lg font-bold">A</span>
          </div>
          {isAdminOnline && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-3 border-white rounded-full shadow-sm animate-pulse"></div>
          )}
        </div>
        
        <div className="flex flex-col">
          <span className="text-base font-bold text-gray-900">
            Admin Support
          </span>
          <div className="flex items-center space-x-2">
            <div className={`w-2.5 h-2.5 rounded-full ${
              isLoading ? 'bg-yellow-500 animate-pulse' : 
              isAdminOnline ? 'bg-green-500' : 'bg-gray-400'
            }`} />
            <span className={`text-sm font-medium ${
              isLoading ? 'text-yellow-600' : 
              isAdminOnline ? 'text-green-600' : 'text-gray-500'
            }`}>
              {isLoading ? 'Connecting...' : 
               isAdminOnline ? 'Active now' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-1">
        {/* Expand/Collapse button */}
        {onToggleExpand && (
          <button
            onClick={onToggleExpand}
            className="p-2 hover:bg-blue-100 rounded-full transition-all duration-200 hover:scale-105"
            aria-label={isExpanded ? "Collapse chat" : "Expand chat"}
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4 text-blue-600" />
            ) : (
              <Maximize2 className="w-4 h-4 text-blue-600" />
            )}
          </button>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="p-2 hover:bg-red-100 rounded-full transition-all duration-200 hover:scale-105"
          aria-label="Close chat"
        >
          <X className="w-4 h-4 text-red-500" />
        </button>
      </div>
    </div>
  );
};
