import React, { useState, useRef } from 'react';
import { uploadMultipleImages } from '../lib/cloudinaryStorage';
import { awardPoints } from '../lib/points';
import { useAuthStore } from '../store/authStore';
import { Loader2, Upload, X, MapPin, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface IssueReportFormProps {
  onSubmit: (report: IssueReport) => void;
}

export interface IssueReport {
  title: string;
  description: string;
  category: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  images: string[];
  priority: 'low' | 'medium' | 'high';
}

const categories = [
  'Pothole',
  'Street Light',
  'Trash Collection',
  'Graffiti',
  'Sidewalk Damage',
  'Traffic Sign',
  'Other'
];

const priorityColors = {
  low: 'text-success bg-success bg-opacity-10',
  medium: 'text-warning-dark bg-warning bg-opacity-10',
  high: 'text-danger bg-danger bg-opacity-10'
};

export const IssueReportForm: React.FC<IssueReportFormProps> = ({ onSubmit }) => {
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<IssueReport>>({
    title: '',
    description: '',
    category: '',
    priority: 'medium',
    images: [],
  });

  const [location, setLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    try {
      const fileArray = Array.from(files);
      const imageUrls = await uploadMultipleImages(fileArray);
      setUploadedImages(prev => [...prev, ...imageUrls]);
      setFormData(prev => ({ ...prev, images: [...prev.images || [], ...imageUrls] }));
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Failed to upload images. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!user) {
        throw new Error('You must be logged in to submit a report');
      }

      if (!location) {
        throw new Error('Please select a location on the map');
      }

      // Create the report
      const { data: report, error } = await supabase
        .from('reports')
        .insert({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          status: 'pending',
          priority: formData.priority,
          location_lat: location.lat,
          location_lng: location.lng,
          location_address: location.address,
          user_id: user.id,
          images: uploadedImages,
        })
        .select()
        .single();

      if (error) throw error;

      // Award points for submitting a report
      await awardPoints(user.id, 'REPORT_SUBMITTED', report.id);

      // Reset form
      setFormData({
        title: '',
        description: '',
        category: '',
        priority: 'medium',
        images: [],
      });
      setLocation(null);
      setUploadedImages([]);
      
      onSubmit(report);
    } catch (error) {
      console.error('Error submitting report:', error);
      alert(error instanceof Error ? error.message : 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6">
      <div className="space-y-6">
        <div>
          <label className="label" htmlFor="title">
            Title
          </label>
          <input
            id="title"
            type="text"
            required
            className="input"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Brief description of the issue"
          />
        </div>

        <div>
          <label className="label" htmlFor="category">
            Category
          </label>
          <select
            id="category"
            required
            className="input"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category} value={category.toLowerCase()}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            required
            rows={4}
            className="input"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Provide detailed information about the issue"
          />
        </div>

        <div>
          <label className="label" htmlFor="priority">
            Priority
          </label>
          <select
            id="priority"
            required
            className="input"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' })}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          {formData.priority && (
            <div className={`mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm ${priorityColors[formData.priority]}`}>
              {formData.priority.charAt(0).toUpperCase() + formData.priority.slice(1)} Priority
            </div>
          )}
        </div>

        <div>
          <label className="label mb-2">
            Location
          </label>
          <div className="rounded-lg overflow-hidden border border-gray-200">
            <MapPicker 
              onLocationSelect={setLocation} 
              initialLocation={location || undefined}
            />
          </div>
          {location && (
            <div className="mt-2 flex items-center text-sm text-gray-600">
              <MapPin className="h-4 w-4 mr-1" />
              {location.address || `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`}
            </div>
          )}
        </div>

        <div>
          <label className="label mb-2">
            Images
            <span className="text-sm text-gray-700 ml-2">(Optional)</span>
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-primary-color transition-colors">
            <div className="space-y-1 text-center">
              <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label htmlFor="images" className="relative cursor-pointer rounded-md font-medium text-primary-color hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-color">
                  <span>Upload images</span>
                  <input
                    id="images"
                    type="file"
                    multiple
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => handleImageUpload(e.target.files)}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-700">PNG, JPG, GIF up to 10MB</p>
            </div>
          </div>

          {uploadedImages.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-4">
              {uploadedImages.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="h-24 w-full object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedImages(prev => prev.filter((_, i) => i !== index));
                      setFormData(prev => ({
                        ...prev,
                        images: prev.images?.filter((_, i) => i !== index)
                      }));
                    }}
                    className="absolute top-1 right-1 p-1 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-6 border-t border-gray-200">
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Submitting...
            </>
          ) : (
            'Submit Report'
          )}
        </button>
      </div>
    </form>
  );
}; 