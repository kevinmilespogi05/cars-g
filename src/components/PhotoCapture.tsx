import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, RotateCcw, Check } from 'lucide-react';
import { uploadImage } from '../lib/cloudinaryStorage';

interface PhotoCaptureProps {
  onPhotoCaptured: (photoUrl: string) => void;
  onClose: () => void;
  maxPhotos?: number;
  currentPhotos?: string[];
  folder?: string;
}

export function PhotoCapture({ 
  onPhotoCaptured, 
  onClose, 
  maxPhotos = 5, 
  currentPhotos = [],
  folder = 'cars-g/photos'
}: PhotoCaptureProps) {
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string>('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const remainingSlots = maxPhotos - currentPhotos.length - capturedPhotos.length;

  // Check if device supports camera
  const supportsCamera = 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;

  // Start camera stream
  const startCamera = useCallback(async () => {
    if (!supportsCamera) {
      setError('Camera not supported on this device');
      return;
    }

    try {
      setIsCapturing(true);
      setError('');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please check permissions.');
      setIsCapturing(false);
    }
  }, [supportsCamera]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  }, []);

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

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob and create preview URL
    canvas.toBlob(async (blob) => {
      if (!blob) return;

      // Create file from blob
      const file = new File([blob], `photo_${Date.now()}.jpg`, {
        type: 'image/jpeg'
      });

      // Upload to Cloudinary
      try {
        setUploadProgress(0);
        const photoUrl = await uploadImage(file);
        setCapturedPhotos(prev => [...prev, photoUrl]);
        setUploadProgress(100);
        
        // Small delay to show progress
        setTimeout(() => setUploadProgress(0), 500);
      } catch (err) {
        console.error('Error uploading photo:', err);
        setError('Failed to upload photo. Please try again.');
      }
    }, 'image/jpeg', 0.9);
  }, []);

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

    try {
      setUploadProgress(0);
      const photoUrl = await uploadImage(file);
      setCapturedPhotos(prev => [...prev, photoUrl]);
      setUploadProgress(100);
      
      setTimeout(() => setUploadProgress(0), 500);
    } catch (err) {
      console.error('Error uploading photo:', err);
      setError('Failed to upload photo. Please try again.');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove captured photo
  const removePhoto = (index: number) => {
    setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Confirm and send photos
  const confirmPhotos = () => {
    capturedPhotos.forEach(photoUrl => {
      onPhotoCaptured(photoUrl);
    });
    onClose();
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Capture Photos</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Camera View */}
          {isCapturing && (
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-64 object-cover rounded-lg"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Camera Controls */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
                <button
                  onClick={capturePhoto}
                  className="bg-white p-3 rounded-full shadow-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 bg-red-500 rounded-full border-4 border-white"></div>
                </button>
                <button
                  onClick={stopCamera}
                  className="bg-white p-2 rounded-full shadow-lg hover:bg-gray-50 transition-colors"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>
          )}

          {/* Camera Start Button */}
          {!isCapturing && supportsCamera && (
            <button
              onClick={startCamera}
              disabled={remainingSlots <= 0}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              <Camera className="h-5 w-5" />
              <span>Open Camera</span>
            </button>
          )}

          {/* File Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={remainingSlots <= 0}
            className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            <Upload className="h-5 w-5" />
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

          {/* Upload Progress */}
          {uploadProgress > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Photo Count */}
          <div className="text-sm text-gray-600 text-center">
            {remainingSlots > 0 ? (
              <span>You can add {remainingSlots} more photo{remainingSlots !== 1 ? 's' : ''}</span>
            ) : (
              <span className="text-red-600">Maximum photos reached</span>
            )}
          </div>

          {/* Captured Photos Preview */}
          {capturedPhotos.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Captured Photos:</h4>
              <div className="grid grid-cols-3 gap-2">
                {capturedPhotos.map((photoUrl, index) => (
                  <div key={index} className="relative">
                    <img
                      src={photoUrl}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-20 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmPhotos}
              disabled={capturedPhotos.length === 0}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              <Check className="h-4 w-4" />
              <span>Add Photos ({capturedPhotos.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
