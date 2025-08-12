import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, MapPin, Loader2, AlertCircle, X } from 'lucide-react';
import { MapPicker } from '../components/MapPicker';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { uploadMultipleImages } from '../lib/cloudinaryStorage';
import { awardPoints } from '../lib/points';

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
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });
  const [location, setLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);

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
      // Upload images if any
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
        status: 'pending'
      };

      console.log('Submitting report with data:', reportData);

      // Create the report
      const { data: report, error } = await supabase
        .from('reports')
        .insert([reportData])
        .select()
        .single();

      if (error) throw error;

      // Award points for submitting the report
      try {
        await awardPoints(user.id, 'REPORT_SUBMITTED', report.id);
      } catch (error) {
        console.error('Error awarding points:', error);
        // Don't throw here, as the report was still created successfully
      }

      // Clean up preview URLs
      imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));

      // Show success message
      alert('Report submitted successfully! Your report will be reviewed by authorities.');
      
      // Navigate to reports page
      navigate('/reports');
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

  // Clean up preview URLs when component unmounts
  React.useEffect(() => {
    return () => {
      imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-6">
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
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Images (Optional)
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-primary-color transition-colors">
            <div className="space-y-1 text-center">
              <Camera className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                >
                  <span>Upload files</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    multiple
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleImageUpload}
                    disabled={isSubmitting}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-700">
                PNG, JPG, GIF, WebP up to 10MB (max {MAX_IMAGES} images)
              </p>
            </div>
          </div>
          
          {uploadError && (
            <div className="mt-2 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {uploadError}
            </div>
          )}
          
          {imagePreviewUrls.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-4">
              {imagePreviewUrls.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="h-24 w-full object-cover rounded-md"
                  />
                  <button
                    type="button"
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeImage(index)}
                    disabled={isSubmitting}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
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
    </div>
  );
}