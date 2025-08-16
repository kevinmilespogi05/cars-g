import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, MapPin, Loader2, AlertCircle, X, CheckCircle, Upload } from 'lucide-react';
import { MapPicker } from '../components/MapPicker';
import { useAuthStore } from '../store/authStore';
import { uploadMultipleImages } from '../lib/cloudinaryStorage';
import { awardPoints } from '../lib/points';
import { reportsService } from '../services/reportsService';
import { PhotoCapture } from '../components/PhotoCapture';

const CATEGORIES = [
  'Infrastructure',
  'Safety',
  'Environmental',
  'Public Services',
  'Other'
];

const MAX_IMAGES = 5;

export function CreateReport() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });
  const [location, setLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (!e.target.files || e.target.files.length === 0) return;
    
    const files = Array.from(e.target.files);
    
    // Check if adding new files would exceed the limit
    if (uploadedImages.length + files.length > MAX_IMAGES) {
      setUploadError(`You can only upload up to ${MAX_IMAGES} images`);
      return;
    }

    // Validate file types and sizes
    const invalidFiles = files.filter(file => {
      const isValidType = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type);
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      return !isValidType || !isValidSize;
    });

    if (invalidFiles.length > 0) {
      setUploadError('Some files were invalid. Please ensure all files are images under 10MB.');
      return;
    }

    setUploadedImages(prev => [...prev, ...files]);
    
    // Create preview URLs
    const newPreviewUrls = files.map(file => URL.createObjectURL(file));
    setImagePreviewUrls(prev => [...prev, ...newPreviewUrls]);
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviewUrls(prev => {
      // Revoke the URL to prevent memory leaks
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
    setUploadError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('You must be logged in to submit a report');
      return;
    }

    if (!location) {
      alert('Please select a location on the map');
      return;
    }

    if (!formData.title.trim()) {
      alert('Please enter a title for the report');
      return;
    }

    if (!formData.category) {
      alert('Please select a category for the report');
      return;
    }

    setIsSubmitting(true);
    setUploadError(null);

    try {
      let imageUrls: string[] = [];

      // Upload all images (both uploaded files and captured photos) together
      if (uploadedImages.length > 0) {
        console.log('🚀 Starting upload of', uploadedImages.length, 'images...');
        console.log('📁 Files to upload:', uploadedImages.map(f => ({ name: f.name, size: f.size, type: f.type })));
        
        imageUrls = await uploadMultipleImages(uploadedImages);
        console.log('✅ Upload completed. URLs:', imageUrls);
      } else {
        console.log('ℹ️ No images to upload');
      }

      const reportData = {
        user_id: user.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        priority: formData.priority,
        location_lat: location.lat,
        location_lng: location.lng,
        location_address: location.address || `${location.lat}, ${location.lng}`,
        images: imageUrls,
      };

      console.log('📤 Submitting report with data:', reportData);

      // Create the report and get the real ID
      const createdReport = await reportsService.createReport(reportData);
      console.log('✅ Report created successfully:', createdReport);

      // Award points with the real report ID
      try {
        await awardPoints(user.id, 'REPORT_SUBMITTED', createdReport.id);
        console.log('🎯 Points awarded successfully');
      } catch (error) {
        console.error('❌ Error awarding points:', error);
        // Don't throw here, as the report was still created successfully
      }

      // Clean up preview URLs
      imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));

      // Show success state
      setSubmitSuccess(true);
      
      // Auto-navigate after 2 seconds
      setTimeout(() => {
        navigate('/reports');
      }, 2000);
      
    } catch (error) {
      console.error('❌ Error creating report:', error);
      if (error instanceof Error) {
        setUploadError(error.message);
      } else {
        setUploadError('Failed to submit report. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Enhanced photo handling
  const handlePhotoCaptured = (photoFile: File) => {
    // Add the captured photo file to the uploaded images
    setUploadedImages(prev => [...prev, photoFile]);
    
    // Create a preview URL for display
    const previewUrl = URL.createObjectURL(photoFile);
    setImagePreviewUrls(prev => [...prev, previewUrl]);
  };

  // Enhanced image upload section
  const renderImageUploadSection = () => {
    const remainingSlots = MAX_IMAGES - uploadedImages.length;
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Photos</h3>
            <p className="text-sm text-gray-600 mt-1">Add up to 5 photos to help describe the issue</p>
          </div>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => setShowPhotoCapture(true)}
              disabled={remainingSlots <= 0}
              className="bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2 font-medium shadow-md hover:shadow-lg"
            >
              <Camera className="h-4 w-4" />
              <span>Capture</span>
            </button>
            <label className="bg-gray-600 text-white px-4 py-2.5 rounded-lg hover:bg-gray-700 cursor-pointer transition-all duration-200 flex items-center space-x-2 font-medium shadow-md hover:shadow-lg">
              <Upload className="h-4 w-4" />
              <span>Upload</span>
              <input
                type="file"
                multiple
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
                className="hidden"
                disabled={remainingSlots <= 0}
              />
            </label>
          </div>
        </div>

        {/* Photo count indicator */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
          <span className="text-sm font-medium text-gray-700">
            {uploadedImages.length}/5 photos selected
          </span>
          {uploadedImages.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setUploadedImages([]);
                setImagePreviewUrls([]);
                setUploadError(null);
              }}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Image previews */}
        {imagePreviewUrls.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {imagePreviewUrls.map((url, index) => (
              <div key={index} className="relative group">
                <img
                  src={url}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg shadow-md border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600 shadow-lg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload error */}
        {uploadError && (
          <div className="text-red-600 text-sm bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5" />
              <span>{uploadError}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Clean up preview URLs when component unmounts
  React.useEffect(() => {
    return () => {
      imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-8 text-white text-center">
              <CheckCircle className="mx-auto h-16 w-16 mb-4" />
              <h2 className="text-3xl font-bold mb-2">Report Submitted Successfully!</h2>
              <p className="text-green-100 text-lg">
                Your report has been submitted and will be reviewed by authorities.
              </p>
            </div>
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
              <p className="text-gray-600 mb-6">
                You'll be redirected to the reports page shortly...
              </p>
              <button
                onClick={() => navigate('/reports')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
              >
                Go to Reports
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 text-white">
            <h1 className="text-3xl font-bold">Create New Report</h1>
            <p className="text-blue-100 mt-2">Help improve your community by reporting issues</p>
          </div>

          {/* Form Content */}
          <div className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Information Section */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">Basic Information</h2>
                
                <div>
                  <label htmlFor="title-input" className="block text-sm font-medium text-gray-700 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="title-input"
                    type="text"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Brief description of the issue"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="category-select" className="block text-sm font-medium text-gray-700 mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="category-select"
                      aria-label="Select report category"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="">Select a category</option>
                      {CATEGORIES.map((category) => (
                        <option key={category} value={category.toLowerCase()}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="priority-select" className="block text-sm font-medium text-gray-700 mb-2">
                      Priority <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="priority-select"
                      aria-label="Select report priority"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' })}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Provide a detailed description of the issue you're reporting..."
                  />
                </div>
              </div>

              {/* Location Section */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">Location</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Location <span className="text-red-500">*</span>
                  </label>
                  <MapPicker 
                    onLocationSelect={setLocation} 
                    initialLocation={location || undefined}
                  />
                  {location && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        <span className="font-medium">Selected:</span> {location.address || `${location.lat}, ${location.lng}`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Photos Section */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">Photos</h2>
                {renderImageUploadSection()}
              </div>

              {/* Submit Section */}
              <div className="pt-6 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                  <div className="text-sm text-gray-600">
                    <span className="text-red-500">*</span> Required fields
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center font-medium shadow-lg hover:shadow-xl"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Report'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Photo Capture Modal */}
        {showPhotoCapture && (
          <PhotoCapture
            onPhotoCaptured={handlePhotoCaptured}
            onClose={() => setShowPhotoCapture(false)}
            maxPhotos={MAX_IMAGES}
            currentPhotos={uploadedImages}
            folder="cars-g/reports"
          />
        )}
      </div>
    </div>
  );
}