import React, { useState } from 'react';
import { MapPicker } from './MapPicker';
import { uploadMultipleImages } from '../lib/storage';
import { awardPoints } from '../lib/points';
import { useAuthStore } from '../store/authStore';
import { Loader2 } from 'lucide-react';
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

      // Upload images if any
      let imageUrls: string[] = [];
      if (uploadedImages.length > 0) {
        imageUrls = await uploadMultipleImages(uploadedImages);
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
          images: imageUrls,
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
        category: 'road',
        priority: 'medium',
      });
      setLocation(null);
      setUploadedImages([]);
      
      // Show success message
      alert('Report submitted successfully! You earned 10 points.');
    } catch (error) {
      console.error('Error submitting report:', error);
      alert(error instanceof Error ? error.message : 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      <div>
        <label className="block text-sm font-medium text-gray-700">Title</label>
        <input
          type="text"
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Category</label>
        <select
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
        >
          <option value="">Select a category</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          required
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Priority</label>
        <select
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          value={formData.priority}
          onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' })}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
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
        <label className="block text-sm font-medium text-gray-700">Images (Optional)</label>
        <input
          type="file"
          multiple
          accept="image/*"
          className="mt-1 block w-full"
          onChange={(e) => handleImageUpload(e.target.files)}
        />
        {uploadedImages.length > 0 && (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {uploadedImages.map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`Uploaded ${index + 1}`}
                className="w-full h-24 object-cover rounded"
              />
            ))}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
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
    </form>
  );
}; 