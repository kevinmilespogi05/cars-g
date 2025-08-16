import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, X, RotateCcw, Check, AlertCircle } from 'lucide-react';

interface PhotoCaptureProps {
  onPhotoCaptured: (photoFile: File) => void;
  onClose: () => void;
  maxPhotos?: number;
  currentPhotos?: File[];
  folder?: string;
}

export function PhotoCapture({ 
  onPhotoCaptured, 
  onClose, 
  maxPhotos = 5, 
  currentPhotos = [],
  folder = 'cars-g/photos'
}: PhotoCaptureProps) {
  const [capturedPhotos, setCapturedPhotos] = useState<File[]>([]);
  const [localPhotoUrls, setLocalPhotoUrls] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string>('');
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [showCameraSettings, setShowCameraSettings] = useState(false);
  const [cameraQuality, setCameraQuality] = useState<'low' | 'medium' | 'high'>('high');
  const [isCameraInverted, setIsCameraInverted] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const remainingSlots = maxPhotos - currentPhotos.length - capturedPhotos.length;

  // Check if device supports camera
  const supportsCamera = 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;

  // Get available cameras
  const getAvailableCameras = useCallback(async () => {
    if (!supportsCamera) return;
    
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setAvailableCameras(videoDevices);
      
      // Set default camera (prefer back camera on mobile)
      if (videoDevices.length > 0) {
        const backCamera = videoDevices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('environment')
        );
        const frontCamera = videoDevices.find(device => 
          device.label.toLowerCase().includes('front') || 
          device.label.toLowerCase().includes('user')
        );
        
        // Prefer back camera, then front camera, then first available
        setSelectedCamera(backCamera?.deviceId || frontCamera?.deviceId || videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error('Error getting camera devices:', err);
    }
  }, [supportsCamera]);

  // Get quality constraints
  const getQualityConstraints = () => {
    switch (cameraQuality) {
      case 'low':
        return { width: { ideal: 640 }, height: { ideal: 480 } };
      case 'medium':
        return { width: { ideal: 1280 }, height: { ideal: 720 } };
      case 'high':
        return { width: { ideal: 1920 }, height: { ideal: 1080 } };
      default:
        return { width: { ideal: 1280 }, height: { ideal: 720 } };
    }
  };

  // Start camera stream
  const startCamera = useCallback(async () => {
    if (!supportsCamera) {
      setError('Camera not supported on this device');
      return;
    }

    try {
      setIsCapturing(true);
      setError('');
      
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
          ...getQualityConstraints()
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please check permissions.');
      setIsCapturing(false);
    }
  }, [supportsCamera, selectedCamera, cameraQuality]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  }, []);

  // Switch camera
  const switchCamera = useCallback(async () => {
    if (isCapturing) {
      stopCamera();
      // Small delay to ensure stream is fully stopped
      setTimeout(() => {
        startCamera();
      }, 100);
    }
  }, [isCapturing, stopCamera, startCamera]);

  // Get available cameras on mount
  useEffect(() => {
    getAvailableCameras();
  }, [getAvailableCameras]);

  // Capture photo from camera
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !streamRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Apply camera inversion if enabled
    if (isCameraInverted) {
      context.scale(-1, 1);
      context.translate(-canvas.width, 0);
    }

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Reset transformation for next capture
    if (isCameraInverted) {
      context.setTransform(1, 0, 0, 1, 0, 0);
    }

    // Convert to blob and create local preview URL
    canvas.toBlob(async (blob) => {
      if (!blob) return;

      // Create File object from blob
      const file = new File([blob], `photo_${Date.now()}.jpg`, {
        type: 'image/jpeg'
      });

      // Create local preview URL
      const localUrl = URL.createObjectURL(blob);
      
      // Store locally (don't upload to Cloudinary yet)
      setLocalPhotoUrls(prev => [...prev, localUrl]);
      setCapturedPhotos(prev => [...prev, file]);
    }, 'image/jpeg', 0.9);
  }, [isCameraInverted]);

  // Handle file input for manual photo selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError('Image file size must be less than 10MB');
      return;
    }

    // Create local preview URL
    const localUrl = URL.createObjectURL(file);
    
    // Store locally (don't upload to Cloudinary yet)
    setLocalPhotoUrls(prev => [...prev, localUrl]);
    setCapturedPhotos(prev => [...prev, file]);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove captured photo
  const removePhoto = (index: number) => {
    // Clean up the local URL
    const photoToRemove = localPhotoUrls[index];
    if (photoToRemove) {
      URL.revokeObjectURL(photoToRemove);
    }
    
    setLocalPhotoUrls(prev => prev.filter((_, i) => i !== index));
    setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Confirm and send photos
  const confirmPhotos = async () => {
    if (capturedPhotos.length === 0) {
      console.log('ℹ️ No photos to confirm, closing modal');
      onClose();
      return;
    }

    console.log('📸 Confirming', capturedPhotos.length, 'photos (no upload happening here)');
    setError('');

    try {
      // Send each photo file to the parent component
      capturedPhotos.forEach((photoFile, index) => {
        console.log(`📁 Sending photo ${index + 1}:`, { name: photoFile.name, size: photoFile.size, type: photoFile.type });
        onPhotoCaptured(photoFile);
      });

      // Clean up local URLs
      localPhotoUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });

      console.log('✅ Photos confirmed, closing modal');
      onClose();
    } catch (err) {
      console.error('❌ Error processing photos:', err);
      setError('Failed to process photos. Please try again.');
    }
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      stopCamera();
      // Clean up all local URLs
      localPhotoUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [stopCamera, localPhotoUrls]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999] p-4" style={{ isolation: 'isolate' }}>
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative isolate bg-white" 
        style={{ 
          zIndex: 10000,
          isolation: 'isolate',
          position: 'relative'
        }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50 rounded-t-xl relative z-20 bg-gray-50"
          style={{ isolation: 'isolate' }}
        >
          <h3 className="text-xl font-semibold text-gray-900">Capture Photos</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div 
          className="p-6 space-y-6 relative z-20 bg-white" 
          style={{ 
            zIndex: 10001,
            isolation: 'isolate',
            position: 'relative'
          }}
        >
          {/* Camera Settings */}
          {availableCameras.length > 1 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-700">Camera Source</h4>
                <button
                  onClick={() => setShowCameraSettings(!showCameraSettings)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  {showCameraSettings ? 'Hide' : 'Settings'}
                </button>
              </div>
              
              {showCameraSettings && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Camera Device</label>
                    <select
                      value={selectedCamera}
                      onChange={(e) => setSelectedCamera(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {availableCameras.map((camera) => (
                        <option key={camera.deviceId} value={camera.deviceId}>
                          {camera.label || `Camera ${camera.deviceId.slice(0, 8)}...`}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Video Quality</label>
                    <select
                      value={cameraQuality}
                      onChange={(e) => setCameraQuality(e.target.value as 'low' | 'medium' | 'high')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="low">Low (640x480)</option>
                      <option value="medium">Medium (1280x720)</option>
                      <option value="high">High (1920x1080)</option>
                    </select>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isCameraInverted}
                        onChange={(e) => setIsCameraInverted(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">Mirror Camera (Flip Horizontally)</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">Useful for front-facing cameras to show mirror-like view</p>
                  </div>
                  
                  {isCapturing && (
                    <div className="md:col-span-2">
                      <button
                        onClick={switchCamera}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
                      >
                        <RotateCcw className="h-4 w-4" />
                        <span>Switch Camera</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Camera View */}
          {isCapturing && (
            <div className="relative bg-gray-900 rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-80 md:h-96 object-cover ${isCameraInverted ? 'transform scale-x-[-1]' : ''}`}
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Camera Controls */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
                <button
                  onClick={capturePhoto}
                  className="bg-white p-3 rounded-full shadow-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-red-500 rounded-full border-4 border-white"></div>
                </button>
                <button
                  onClick={stopCamera}
                  className="bg-white p-2 rounded-full shadow-lg hover:bg-gray-50 transition-colors"
                >
                  <X className="h-6 w-6 text-gray-600" />
                </button>
              </div>
              
              {/* Quick Camera Switch Button */}
              {availableCameras.length > 1 && (
                <button
                  onClick={switchCamera}
                  className="absolute top-4 right-4 bg-white p-2 rounded-full shadow-lg hover:bg-gray-50 transition-colors"
                  title="Switch Camera"
                >
                  <RotateCcw className="h-5 w-5 text-gray-600" />
                </button>
              )}
              
              {/* Camera Inversion Indicator */}
              {isCameraInverted && (
                <div className="absolute top-4 left-4 bg-blue-600 text-white px-2 py-1 rounded-md text-xs font-medium">
                  Mirror Mode
                </div>
              )}
            </div>
          )}

          {/* Camera Start Button */}
          {!isCapturing && supportsCamera && (
            <button
              onClick={startCamera}
              disabled={remainingSlots <= 0}
              className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-3 text-lg font-medium shadow-lg hover:shadow-xl"
            >
              <Camera className="h-6 w-6" />
              <span>Open Camera</span>
            </button>
          )}

          {/* File Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={remainingSlots <= 0}
            className="w-full bg-gray-600 text-white py-4 px-6 rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-3 text-lg font-medium shadow-lg hover:shadow-xl"
          >
            <Upload className="h-6 w-6" />
            <span>Choose Photo</span>
          </button>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Error Message */}
          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Photo Count */}
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-800">
              {remainingSlots > 0 ? (
                <span>You can add <strong>{remainingSlots}</strong> more photo{remainingSlots !== 1 ? 's' : ''}</span>
              ) : (
                <span className="text-red-600 font-medium">Maximum photos reached</span>
              )}
            </div>
          </div>

          {/* Captured Photos Preview */}
          {capturedPhotos.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 text-center">Captured Photos:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {capturedPhotos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg shadow-md"
                    />
                    <button
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors shadow-lg opacity-0 group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-4 pt-4">
            <button
              onClick={onClose}
              disabled={false} // No upload in progress
              className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={confirmPhotos}
              disabled={capturedPhotos.length === 0}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2 font-medium shadow-lg hover:shadow-xl"
            >
              <Check className="h-5 w-5" />
              <span>Add Photos ({capturedPhotos.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
