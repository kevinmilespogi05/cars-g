import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, MapPin, Loader2, AlertCircle, X, CheckCircle } from 'lucide-react';
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
    setSubmitSuccess(false);

    try {
      // Upload images if any (in parallel for speed)
      let imageUrls: string[] = [];
      if (uploadedImages.length > 0) {
        try {
          console.log('Uploading images...');
          imageUrls = await uploadMultipleImages(uploadedImages);
          console.log('Uploaded images:', imageUrls);
        } catch (error) {
          console.error('Error uploading images:', error);
          throw new Error('Failed to upload images. Please try again.');
        }
      }

      const reportData = {
        user_id: user.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        priority: formData.priority,
        location_lat: location.lat,
        location_lng: location.lng,
        location_address: location.address,
        images: imageUrls,
      };

      console.log('Submitting report with data:', reportData);

      // Create the report and get the real ID
      const createdReport = await reportsService.createReport(reportData);

      // Award points with the real report ID
      try {
        await awardPoints(user.id, 'REPORT_SUBMITTED', createdReport.id);
      } catch (error) {
        console.error('Error awarding points:', error);
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
      console.error('Error creating report:', error);
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
  const handlePhotoCaptured = (photoUrl: string) => {
    // Add the captured photo to the uploaded images
    setUploadedImages(prev => [...prev, new File([], 'captured_photo.jpg')]);
    
    // For now, we'll need to create a proper File object
    // In a real implementation, you might want to fetch the image and convert it back to a File
    // For simplicity, we'll use the URL directly and handle it in the upload process
    
    // Add to preview URLs
    setImagePreviewUrls(prev => [...prev, photoUrl]);
  };

  // Enhanced image upload section
  const renderImageUploadSection = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Photos</h3>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => setShowPhotoCapture(true)}
            disabled={uploadedImages.length >= 5}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            <Camera className="h-4 w-4" />
            <span>Capture</span>
          </button>
          <label className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors flex items-center space-x-2">
            <Upload className="h-4 w-4" />
            <span>Upload</span>
            <input
              type="file"
              multiple
              accept="image/*"
              capture="environment"
              onChange={handleImageUpload}
              className="hidden"
              disabled={uploadedImages.length >= 5}
            />
          </label>
        </div>
      </div>

      {/* Photo count indicator */}
      <div className="text-sm text-gray-600">
        {uploadedImages.length}/5 photos selected
      </div>

      {/* Image previews */}
      {imagePreviewUrls.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {imagePreviewUrls.map((url, index) => (
            <div key={index} className="relative group">
              <img
                src={url}
                alt={`Preview ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
          {uploadError}
        </div>
      )}
    </div>
  );

  // Clean up preview URLs when component unmounts
  React.useEffect(() => {
    return () => {
      imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  if (submitSuccess) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <div className="bg-green-50 border border-green-200 rounded-lg p-8">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h2 className="text-2xl font-bold text-green-800 mb-2">Report Submitted Successfully!</h2>
          <p className="text-green-600 mb-4">
            Your report has been submitted and will be reviewed by authorities. 
            You'll be redirected to the reports page shortly.
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold mb-6">Create New Report</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Brief description of the issue"
            />
          </div>
          
          <div>
            <label htmlFor="category-select" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="category-select"
              aria-label="Select report category"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
            <label htmlFor="priority-select" className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              id="priority-select"
              aria-label="Select report priority"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              required
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description of the issue"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <MapPicker 
              onLocationSelect={setLocation} 
              initialLocation={location || undefined}
            />
            {location && (
              <p className="mt-2 text-sm text-gray-500">
                Selected: {location.address || `${location.lat}, ${location.lng}`}
              </p>
            )}
          </div>
          
          {/* Enhanced image upload section */}
          {renderImageUploadSection()}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
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
        </form>

        {/* Photo Capture Modal */}
        {showPhotoCapture && (
          <PhotoCapture
            onPhotoCaptured={handlePhotoCaptured}
            onClose={() => setShowPhotoCapture(false)}
            maxPhotos={5}
            currentPhotos={uploadedImages}
            folder="cars-g/reports"
          />
        )}
      </div>
    </div>
  );
}