import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Move } from 'lucide-react';

interface MoveableChatButtonProps {
  isOpen: boolean;
  onClick: () => void;
  unreadCount?: number;
  isOnline?: boolean;
  onPositionChange?: (position: { x: number; y: number }) => void;
}

export const MoveableChatButton: React.FC<MoveableChatButtonProps> = ({
  isOpen,
  onClick,
  unreadCount = 0,
  isOnline = false,
  onPositionChange
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);

  // Load saved position from localStorage on mount
  useEffect(() => {
    const savedPosition = localStorage.getItem('chatButtonPosition');
    if (savedPosition) {
      try {
        const { x, y } = JSON.parse(savedPosition);
        setPosition({ x, y });
      } catch (error) {
        console.error('Error loading chat button position:', error);
        // Set default position if loading fails
        setPosition({ x: window.innerWidth - 100, y: window.innerHeight - 100 });
      }
    } else {
      // Default position (bottom right)
      setPosition({ x: window.innerWidth - 100, y: window.innerHeight - 100 });
    }
  }, []);

  // Save position to localStorage and notify parent whenever it changes
  useEffect(() => {
    if (position.x !== 0 || position.y !== 0) {
      localStorage.setItem('chatButtonPosition', JSON.stringify(position));
      onPositionChange?.(position);
    }
  }, [position, onPositionChange]);

  // Handle window resize to keep button in bounds
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => ({
        x: Math.min(prev.x, window.innerWidth - 80),
        y: Math.min(prev.y, window.innerHeight - 80)
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start dragging if clicking on the move handle or holding a modifier key
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.move-handle')) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    // Keep button within viewport bounds
    const maxX = window.innerWidth - 80;
    const maxY = window.innerHeight - 80;

    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add global mouse event listeners when dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none'; // Prevent text selection while dragging

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, dragStart]);

  const handleClick = (e: React.MouseEvent) => {
    // Only trigger onClick if not dragging
    if (!isDragging) {
      onClick();
    }
  };

  return (
    <div
      ref={buttonRef}
      className="fixed z-50 select-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Unread count badge */}
      {unreadCount > 0 && !isOpen && (
        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full w-7 h-7 flex items-center justify-center font-bold shadow-lg animate-pulse border-2 border-white z-10">
          {unreadCount > 99 ? '99+' : unreadCount}
        </div>
      )}
      
      {/* Online indicator */}
      {isOnline && !isOpen && (
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full shadow-lg z-10"></div>
      )}

      {/* Move handle - only visible on hover */}
      {isHovered && !isOpen && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 animate-fade-in-fast">
          Drag to move
        </div>
      )}

      {/* Move handle icon */}
      {isHovered && !isOpen && (
        <div className="absolute -top-1 -left-1 w-4 h-4 bg-gray-600 rounded-full flex items-center justify-center move-handle">
          <Move className="w-2 h-2 text-white" />
        </div>
      )}
      
      {/* Chat button */}
      <button
        onClick={handleClick}
        className={`
          w-16 h-16 rounded-2xl shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95
          ${isOpen 
            ? 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700' 
            : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
          }
          ${isDragging ? 'scale-105 shadow-3xl' : ''}
        `}
        style={{
          boxShadow: isDragging 
            ? '0 20px 40px -10px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)'
            : '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)'
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
