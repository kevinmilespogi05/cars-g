import React, { useState, useRef } from 'react';
import { Bot, Camera, Upload, X, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { PhotoCapture } from './PhotoCapture';
import { cloudinary } from '../lib/cloudinary';

interface AIReportingButtonProps {
  onReportGenerated: (reportData: {
    title: string;
    description: string;
    category: string;
    priority: 'low' | 'medium' | 'high';
    imageUrls: string[];
  }) => void;
}

export function AIReportingButton({ onReportGenerated }: AIReportingButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const [capturedImage, setCapturedImage] = useState<File | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<{
    danger_level: 'low' | 'medium' | 'high';
    auto_description: string;
    detected_objects: string[];
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Analysis using Hugging Face Free Inference API
  const analyzeImageWithAI = async (imageUrl: string): Promise<{
    danger_level: 'low' | 'medium' | 'high';
    auto_description: string;
    detected_objects: string[];
  }> => {
    try {
      console.log('🤖 Starting AI analysis with Hugging Face...');
      
      // Using a free computer vision model for object detection
      // You can change this to other models like:
      // - "microsoft/DialoGPT-medium" for text generation
      // - "facebook/detr-resnet-50" for object detection
      // - "google/vit-base-patch16-224" for image classification
      
      const response = await fetch(
        "https://api-inference.huggingface.co/models/facebook/detr-resnet-50",
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_HUGGINGFACE_API_KEY || 'hf_demo'}`,
            "Content-Type": "application/json",
          },
          method: "POST",
          body: JSON.stringify({ inputs: imageUrl }),
        }
      );

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      const result = await response.json();
      console.log('🤖 AI Analysis result:', result);

      // Process the AI results
      const detectedObjects = result.map((item: any) => item.label).filter(Boolean);
      
      // Determine danger level based on detected objects
      const dangerousKeywords = [
        'fire', 'smoke', 'weapon', 'knife', 'gun', 'accident', 'crash', 
        'flood', 'earthquake', 'explosion', 'chemical', 'hazard'
      ];
      
      const mediumKeywords = [
        'crowd', 'traffic', 'construction', 'maintenance', 'warning'
      ];

      const detectedText = detectedObjects.join(' ').toLowerCase();
      let danger_level: 'low' | 'medium' | 'high' = 'low';
      
      if (dangerousKeywords.some(keyword => detectedText.includes(keyword))) {
        danger_level = 'high';
      } else if (mediumKeywords.some(keyword => detectedText.includes(keyword))) {
        danger_level = 'medium';
      }

      // Generate auto description
      let auto_description = 'AI detected objects in the image.';
      if (detectedObjects.length > 0) {
        auto_description = `AI detected: ${detectedObjects.join(', ')}.`;
      }

      return {
        danger_level,
        auto_description,
        detected_objects: detectedObjects
      };

    } catch (error) {
      console.error('❌ AI Analysis failed:', error);
      
      // Fallback analysis if AI fails
      return {
        danger_level: 'medium',
        auto_description: 'AI analysis unavailable. Please review manually.',
        detected_objects: []
      };
    }
  };

  const handlePhotoCaptured = async (photoFile: File) => {
    setCapturedImage(photoFile);
    setError('');
    setIsProcessing(true);

    try {
      console.log('📸 Photo captured, uploading to Cloudinary...');
      
      // Upload image to Cloudinary
      const uploadResult = await cloudinary.uploadImage(photoFile, 'cars-g/ai-reports');
      console.log('✅ Image uploaded:', uploadResult.secureUrl);

      // Analyze with AI
      console.log('🤖 Analyzing image with AI...');
      const analysis = await analyzeImageWithAI(uploadResult.secureUrl);
      setAiAnalysis(analysis);

      // Generate report data
      const reportData = {
        title: `AI Report - ${analysis.danger_level.toUpperCase()} Priority`,
        description: analysis.auto_description,
        category: analysis.danger_level === 'high' ? 'Safety' : 'General',
        priority: analysis.danger_level,
        imageUrls: [uploadResult.secureUrl]
      };

      console.log('📋 Generated report data:', reportData);
      onReportGenerated(reportData);
      
      // Close modal after successful generation
      setTimeout(() => {
        setShowModal(false);
        setCapturedImage(null);
        setAiAnalysis(null);
        setIsProcessing(false);
      }, 2000);

    } catch (error) {
      console.error('❌ Error in AI reporting:', error);
      setError('Failed to process image. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image file size must be less than 10MB');
      return;
    }

    await handlePhotoCaptured(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setShowModal(false);
      setCapturedImage(null);
      setAiAnalysis(null);
      setError('');
    }
  };

  return (
    <>
      {/* Floating AI Reporting Button */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 z-50 group"
        title="AI Quick Report"
      >
        <div className="relative">
          <Bot className="h-6 w-6" />
          <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-yellow-300 animate-pulse" />
        </div>
        
        {/* Tooltip */}
        <div className="absolute right-full mr-3 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
          AI Quick Report
          <div className="absolute left-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-l-gray-900"></div>
        </div>
      </button>

      {/* AI Reporting Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto relative">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50 rounded-t-xl">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-2 rounded-lg">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">AI Quick Report</h3>
                  <p className="text-sm text-gray-600">Let AI analyze and generate your report</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={isProcessing}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {!capturedImage && !isProcessing && (
                <>
                  <div className="text-center space-y-4">
                    <div className="bg-gradient-to-r from-purple-100 to-blue-100 p-6 rounded-xl">
                      <Sparkles className="h-12 w-12 text-purple-600 mx-auto mb-3" />
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        AI-Powered Reporting
                      </h4>
                      <p className="text-sm text-gray-600">
                        Take a photo and let AI automatically analyze it to generate a detailed report with appropriate category and priority.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <button
                        onClick={() => setShowModal(false)}
                        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 font-medium"
                      >
                        <Camera className="h-5 w-5" />
                        <span>Take Photo</span>
                      </button>

                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full bg-gray-600 text-white py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2 font-medium"
                      >
                        <Upload className="h-5 w-5" />
                        <span>Upload Image</span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Processing State */}
              {isProcessing && (
                <div className="text-center space-y-4">
                  <div className="bg-blue-50 p-6 rounded-xl">
                    <Loader2 className="h-12 w-12 text-blue-600 mx-auto mb-3 animate-spin" />
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                      AI is Analyzing...
                    </h4>
                    <p className="text-sm text-gray-600">
                      {capturedImage ? 'Processing image and generating report...' : 'Preparing AI analysis...'}
                    </p>
                  </div>
                </div>
              )}

              {/* AI Analysis Results */}
              {aiAnalysis && !isProcessing && (
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <Sparkles className="h-5 w-5 text-green-600" />
                      <h4 className="font-semibold text-green-800">AI Analysis Complete!</h4>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Priority:</span>
                        <span className={`font-medium ${
                          aiAnalysis.danger_level === 'high' ? 'text-red-600' :
                          aiAnalysis.danger_level === 'medium' ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {aiAnalysis.danger_level.toUpperCase()}
                        </span>
                      </div>
                      
                      {aiAnalysis.detected_objects.length > 0 && (
                        <div>
                          <span className="text-gray-600">Detected:</span>
                          <span className="ml-2 font-medium text-gray-800">
                            {aiAnalysis.detected_objects.join(', ')}
                          </span>
                        </div>
                      )}
                      
                      <div>
                        <span className="text-gray-600">Description:</span>
                        <p className="mt-1 text-gray-800">{aiAnalysis.auto_description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <Bot className="h-5 w-5 text-blue-600" />
                      <h4 className="font-semibold text-blue-800">Report Generated!</h4>
                    </div>
                    <p className="text-sm text-blue-700">
                      Your AI-generated report has been created and is ready for review.
                    </p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-4 rounded-lg border border-red-200">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5" />
                    <span>{error}</span>
                  </div>
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>
        </div>
      )}

      {/* Photo Capture Modal */}
      {showModal && !capturedImage && !isProcessing && (
        <PhotoCapture
          onPhotoCaptured={handlePhotoCaptured}
          onClose={() => setShowModal(false)}
          maxPhotos={1}
          currentPhotos={[]}
          folder="cars-g/ai-reports"
        />
      )}
    </>
  );
}
