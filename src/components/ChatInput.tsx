import React, { useState, useRef, useEffect } from 'react';
import { SendIcon, PaperclipIcon, ImageIcon, MapPinIcon, Loader2, AlertCircleIcon, RefreshCwIcon, Camera, Upload, X, RotateCcw, Check } from 'lucide-react';
import { cloudinary } from '../lib/cloudinary';
import { PhotoCapture } from './PhotoCapture';

interface ChatInputProps {
  onSendMessage: (content: string, messageType: string) => Promise<boolean>;
  onTypingStart: () => void;
  onTypingStop: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onTypingStart,
  onTypingStop,
  disabled = false,
  placeholder = "Type a message...",
}) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [unsentMessages, setUnsentMessages] = useState<Array<{
    id: string;
    content: string;
    messageType: string;
    timestamp: Date;
    error?: string;
    isRetrying?: boolean;
  }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleTyping = (value: string) => {
    setMessage(value);
    
    if (!isTyping) {
      setIsTyping(true);
      onTypingStart();
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onTypingStop();
    }, 1000);
  };

  const handleSendMessage = async () => {
    if (!message.trim() || disabled) return;

    const messageContent = message.trim();
    const messageId = `unsent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Add message to unsent list immediately
    const unsentMessage = {
      id: messageId,
      content: messageContent,
      messageType: 'text' as const,
      timestamp: new Date(),
    };
    
    setUnsentMessages(prev => [...prev, unsentMessage]);
    setMessage('');
    setIsTyping(false);
    onTypingStop();
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      // Try to send the message
      const success = await onSendMessage(messageContent, 'text');
      
      if (success) {
        // Remove from unsent list if successful
        setUnsentMessages(prev => prev.filter(msg => msg.id !== messageId));
      } else {
        // Mark as failed if not successful
        setUnsentMessages(prev => 
          prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, error: 'Failed to send message' }
              : msg
          )
        );
      }
    } catch (error) {
      // Mark as failed if error occurs
      setUnsentMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, error: error instanceof Error ? error.message : 'Failed to send message' }
            : msg
        )
      );
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
    
    // Keyboard shortcuts for unsent messages
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'r' && unsentMessages.length > 0) {
        e.preventDefault();
        // Retry the first failed message
        const failedMessage = unsentMessages.find(msg => msg.error && !msg.isRetrying);
        if (failedMessage) {
          retryMessage(failedMessage);
        }
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const messageContent = `File: ${file.name}`;
    const messageId = `unsent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Add message to unsent list immediately
    const unsentMessage = {
      id: messageId,
      content: messageContent,
      messageType: 'file' as const,
      timestamp: new Date(),
    };
    
    setUnsentMessages(prev => [...prev, unsentMessage]);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    try {
      const success = await onSendMessage(messageContent, 'file');
      
      if (success) {
        // Remove from unsent list if successful
        setUnsentMessages(prev => prev.filter(msg => msg.id !== messageId));
      } else {
        // Mark as failed if not successful
        setUnsentMessages(prev => 
          prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, error: 'Failed to send file' }
              : msg
          )
        );
      }
    } catch (error) {
      // Mark as failed if error occurs
      setUnsentMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, error: error instanceof Error ? error.message : 'Failed to send file' }
            : msg
        )
      );
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      // Reset input even for invalid files
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
      return;
    }

    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image file size must be less than 10MB');
      // Reset input for oversized files
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      console.log('Starting image upload to Cloudinary...', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });

      // Check if Cloudinary is configured
      if (!cloudinary.isConfigured()) {
        throw new Error('Cloudinary is not configured. Please check your environment variables.');
      }

      // Upload image to Cloudinary
      const result = await cloudinary.uploadImage(file, 'cars-g/chat');
      
      console.log('Image uploaded successfully to Cloudinary:', result);
      
      // Send the image URL as a message
      const messageId = `unsent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Add message to unsent list immediately
      const unsentMessage = {
        id: messageId,
        content: result.secureUrl,
        messageType: 'image' as const,
        timestamp: new Date(),
      };
      
      setUnsentMessages(prev => [...prev, unsentMessage]);
      
      try {
        const success = await onSendMessage(result.secureUrl, 'image');
        
        if (success) {
          // Remove from unsent list if successful
          setUnsentMessages(prev => prev.filter(msg => msg.id !== messageId));
        } else {
          // Mark as failed if not successful
          setUnsentMessages(prev => 
            prev.map(msg => 
              msg.id === messageId 
                ? { ...msg, error: 'Failed to send image' }
                : msg
            )
          );
        }
      } catch (error) {
        // Mark as failed if error occurs
        setUnsentMessages(prev => 
          prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, error: error instanceof Error ? error.message : 'Failed to send image' }
              : msg
          )
        );
      }
      
      console.log('Image message sent with URL:', result.secureUrl);
    } catch (error) {
      console.error('Failed to upload image:', error);
      
      // Provide more detailed error information
      let errorMessage = 'Failed to upload image';
      if (error instanceof Error) {
        if (error.message.includes('Cloudinary is not configured')) {
          errorMessage = 'Cloudinary is not configured. Please check your .env file.';
        } else if (error.message.includes('upload preset')) {
          errorMessage = 'Upload preset issue. Please check your Cloudinary dashboard.';
        } else {
          errorMessage = error.message;
        }
      }
      
      alert(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      
      // Always reset input
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  const handleLocationShare = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const messageContent = `Location: ${latitude}, ${longitude}`;
          const messageId = `unsent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Add message to unsent list immediately
          const unsentMessage = {
            id: messageId,
            content: messageContent,
            messageType: 'location' as const,
            timestamp: new Date(),
          };
          
          setUnsentMessages(prev => [...prev, unsentMessage]);

          try {
            const success = await onSendMessage(messageContent, 'location');
            
            if (success) {
              // Remove from unsent list if successful
              setUnsentMessages(prev => prev.filter(msg => msg.id !== messageId));
            } else {
              // Mark as failed if not successful
              setUnsentMessages(prev => 
                prev.map(msg => 
                  msg.id === messageId 
                    ? { ...msg, error: 'Failed to send location' }
                    : msg
                )
              );
            }
          } catch (error) {
            // Mark as failed if error occurs
            setUnsentMessages(prev => 
              prev.map(msg => 
                msg.id === messageId 
                  ? { ...msg, error: error instanceof Error ? error.message : 'Failed to send location' }
                  : msg
              )
            );
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          let msg = 'Unable to get your location';
          if (error.code === 1) msg = 'Location permission denied. Please allow location access and try again.';
          if (error.code === 2) msg = 'Location unavailable. Check device settings and try again.';
          if (error.code === 3) msg = 'Location request timed out. Check your connection and try again.';
          alert(msg);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    } else {
      alert('Geolocation is not supported by this browser');
    }
  };

  const retryMessage = async (unsentMessage: typeof unsentMessages[0]) => {
    try {
      // Mark as retrying
      setUnsentMessages(prev => 
        prev.map(msg => 
          msg.id === unsentMessage.id 
            ? { ...msg, error: undefined, isRetrying: true }
            : msg
        )
      );

      const success = await onSendMessage(unsentMessage.content, unsentMessage.messageType);
      
      if (success) {
        // Remove from unsent list if successful
        setUnsentMessages(prev => prev.filter(msg => msg.id !== unsentMessage.id));
      } else {
        // Mark as failed again
        setUnsentMessages(prev => 
          prev.map(msg => 
            msg.id === unsentMessage.id 
              ? { ...msg, error: 'Retry failed', isRetrying: false }
              : msg
          )
        );
      }
    } catch (error) {
      // Mark as failed if error occurs
      setUnsentMessages(prev => 
        prev.map(msg => 
          msg.id === unsentMessage.id 
            ? { ...msg, error: error instanceof Error ? error.message : 'Retry failed', isRetrying: false }
            : msg
        )
      );
    }
  };

  const removeUnsentMessage = (messageId: string) => {
    setUnsentMessages(prev => prev.filter(msg => msg.id !== messageId));
  };

  // Enhanced photo handling for chat
  const handlePhotoCaptured = async (photoFile: File) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Upload the photo to Cloudinary
      const result = await cloudinary.uploadImage(photoFile, 'cars-g/chat');
      
      console.log('Image uploaded successfully to Cloudinary:', result);
      
      // Send the image URL as a message
      const messageId = `unsent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Add message to unsent list immediately
      const unsentMessage = {
        id: messageId,
        content: result.secureUrl,
        messageType: 'image' as const,
        timestamp: new Date(),
      };
      
      setUnsentMessages(prev => [...prev, unsentMessage]);
      
      try {
        const success = await onSendMessage(result.secureUrl, 'image');
        
        if (success) {
          // Remove from unsent list if successful
          setUnsentMessages(prev => prev.filter(msg => msg.id !== messageId));
        } else {
          // Mark as failed if not successful
          setUnsentMessages(prev => 
            prev.map(msg => 
              msg.id === messageId 
                ? { ...msg, error: 'Failed to send image' }
                : msg
            )
          );
        }
      } catch (error) {
        // Mark as failed if error occurs
        setUnsentMessages(prev => 
          prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, error: error instanceof Error ? error.message : 'Failed to send image' }
              : msg
          )
        );
      }
      
      console.log('Image message sent with URL:', result.secureUrl);
    } catch (error) {
      console.error('Failed to upload image:', error);
      
      // Provide more detailed error information
      let errorMessage = 'Failed to upload image';
      if (error instanceof Error) {
        if (error.message.includes('Cloudinary is not configured')) {
          errorMessage = 'Cloudinary is not configured. Please check your .env file.';
        } else if (error.message.includes('upload preset')) {
          errorMessage = 'Upload preset issue. Please check your Cloudinary dashboard.';
        } else {
          errorMessage = error.message;
        }
      }
      
      alert(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Enhanced file upload section
  const renderFileUploadSection = () => (
    <div className="flex items-center space-x-2">
      {/* Photo Capture Button */}
      <button
        type="button"
        onClick={() => setShowPhotoCapture(true)}
        disabled={disabled}
        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Capture Photo"
      >
        <Camera className="h-5 w-5" />
      </button>

      {/* File Upload Button */}
      <label className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileUpload}
          className="hidden"
          disabled={disabled}
        />
        <Upload className="h-5 w-5" />
      </label>

      {/* Image Upload Button */}
      <label className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageUpload}
          className="hidden"
          disabled={disabled}
        />
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </label>
    </div>
  );

  return (
    <div className="border-t bg-white p-2 sm:p-3 md:p-4">
      {/* Unsent Messages */}
      {unsentMessages.length > 0 && (
        <div className="mb-3 sm:mb-4 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="text-xs font-medium text-gray-600">
                Unsent Messages ({unsentMessages.length})
              </div>
              <div className="hidden sm:block text-xs text-gray-400">
                Ctrl+R to retry failed messages
              </div>
            </div>
            <button
              onClick={() => setUnsentMessages([])}
              className="text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors"
              title="Clear all unsent messages"
            >
              Clear All
            </button>
          </div>
          {unsentMessages.map((unsentMessage) => (
            <div
              key={unsentMessage.id}
              className={`p-2 sm:p-3 rounded-lg border ${
                unsentMessage.isRetrying
                  ? 'bg-blue-50 border-blue-200'
                  : unsentMessage.error
                  ? 'bg-red-50 border-red-200'
                  : 'bg-yellow-50 border-yellow-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {unsentMessage.messageType === 'image' ? (
                    <div className="flex items-center space-x-2">
                      <div className="text-gray-400">🖼️</div>
                      <span className="text-sm text-gray-600">Image message</span>
                    </div>
                  ) : unsentMessage.messageType === 'file' ? (
                    <div className="flex items-center space-x-2">
                      <div className="text-gray-400">📎</div>
                      <span className="text-sm text-gray-600">File message</span>
                    </div>
                  ) : unsentMessage.messageType === 'location' ? (
                    <div className="flex items-center space-x-2">
                      <div className="text-gray-400">📍</div>
                      <span className="text-sm text-gray-600">Location message</span>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 break-words">
                      {unsentMessage.content}
                    </p>
                  )}
                  
                  {unsentMessage.isRetrying && (
                    <p className="text-xs text-blue-600 mt-1 flex items-center space-x-1">
                      <Loader2 size={12} className="animate-spin" />
                      <span>Retrying...</span>
                    </p>
                  )}
                  
                  {unsentMessage.error && !unsentMessage.isRetrying && (
                    <p className="text-xs text-red-600 mt-1 flex items-center space-x-1">
                      <AlertCircleIcon size={12} />
                      <span>{unsentMessage.error}</span>
                    </p>
                  )}
                  
                  <p className="text-xs text-gray-500 mt-1">
                    {unsentMessage.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                
                <div className="flex items-center space-x-2 ml-3">
                  <button
                    onClick={() => retryMessage(unsentMessage)}
                    disabled={unsentMessage.isRetrying}
                    className={`p-1.5 rounded transition-colors ${
                      unsentMessage.isRetrying
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                    }`}
                    title={unsentMessage.isRetrying ? 'Retrying...' : 'Retry sending'}
                  >
                    {unsentMessage.isRetrying ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <RefreshCwIcon size={16} />
                    )}
                  </button>
                  <button
                    onClick={() => removeUnsentMessage(unsentMessage.id)}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Remove message"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Attachment Menu */}
      {showAttachments && (
        <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap gap-2">
            <button
              onClick={() => imageInputRef.current?.click()}
              disabled={isUploading}
              className={`flex items-center space-x-2 px-3 py-2 text-sm rounded transition-colors ${
                isUploading 
                  ? 'text-gray-400 bg-gray-100 cursor-not-allowed' 
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              {isUploading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ImageIcon size={16} />
              )}
              <span>{isUploading ? 'Uploading...' : 'Image'}</span>
            </button>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded transition-colors"
            >
              <PaperclipIcon size={16} />
              <span>File</span>
            </button>
            
            <button
              onClick={handleLocationShare}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded transition-colors"
            >
              <MapPinIcon size={16} />
              <span>Location</span>
            </button>
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileUpload}
        className="hidden"
        accept="*/*"
      />
      <input
        ref={imageInputRef}
        type="file"
        onChange={handleImageUpload}
        className="hidden"
        accept="image/*"
      />

      {/* Message Input */}
      <div className="flex items-end space-x-2 sm:space-x-3">
        <button
          onClick={() => setShowAttachments(!showAttachments)}
          className={`flex-shrink-0 p-2 sm:p-2.5 rounded-lg transition-colors ${
            showAttachments 
              ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
          disabled={disabled}
          title="Attachments"
        >
          <PaperclipIcon size={18} className="sm:w-5 sm:h-5" />
        </button>

        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-200 text-sm sm:text-base"
            rows={1}
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
        </div>

        <button
          onClick={handleSendMessage}
          disabled={!message.trim() || disabled}
          className={`flex-shrink-0 p-2 sm:p-2.5 rounded-lg transition-all duration-200 ${
            !message.trim() || disabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600 hover:scale-105'
          }`}
          title="Send message"
        >
          <SendIcon size={18} className="sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Typing indicator */}
      {isTyping && (
        <div className="mt-2 text-xs text-gray-500 flex items-center">
          <div className="flex space-x-1 mr-2">
            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          Typing...
        </div>
      )}

      {/* Photo Capture Modal */}
      {showPhotoCapture && (
        <PhotoCapture
          onPhotoCaptured={handlePhotoCaptured}
          onClose={() => setShowPhotoCapture(false)}
          maxPhotos={1}
          currentPhotos={[]}
          folder="cars-g/chat"
        />
      )}
    </div>
  );
}; 