import React, { useState, useEffect } from 'react';
import { track } from '@vercel/analytics';
import { useNavigate } from 'react-router-dom';
import { Camera, MapPin, Loader2, AlertCircle, X, CheckCircle, Upload, Bot, Sparkles } from 'lucide-react';
import { MapPicker } from '../components/MapPicker';
import { useAuthStore } from '../store/authStore';
import { uploadMultipleImages } from '../lib/cloudinaryStorage';
import { awardPoints } from '../lib/points';
import { reportsService } from '../services/reportsService';
import { activityService } from '../services/activityService';
import { enqueueReport, flushQueuedReports } from '../lib/offlineQueue';
import { FocusTrap } from '../components/FocusTrap';
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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [aiGeneratedData, setAiGeneratedData] = useState<{
    title: string;
    description: string;
    category: string;
    priority: 'low' | 'medium' | 'high';
    imageUrls: string[];
  } | null>(null);
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
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const submitButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const safeTrack = (name: string, props?: Record<string, any>) => {
    try {
      // Sample high-volume step events at 30%
      const stepEvent = name === 'report_submit_step';
      if (stepEvent && Math.random() > 0.3) return;
      track(name as any, props as any);
    } catch {}
  };

  // Check for AI-generated report data on component mount
  useEffect(() => {
    safeTrack('report_form_opened');
    const aiReportData = localStorage.getItem('aiGeneratedReport');
    if (aiReportData) {
      try {
        const parsedData = JSON.parse(aiReportData);
        setAiGeneratedData(parsedData);
        
        // Pre-fill the form with AI-generated data
        setFormData({
          title: parsedData.title,
          description: parsedData.description,
          category: parsedData.category,
          priority: parsedData.priority,
        });
        
        // Set image preview URLs from AI-generated data
        setImagePreviewUrls(parsedData.imageUrls);
        
        // Clear the localStorage
        localStorage.removeItem('aiGeneratedReport');
        
        console.log('🤖 AI-generated report data loaded:', parsedData);
      } catch (error) {
        console.error('Error parsing AI report data:', error);
        localStorage.removeItem('aiGeneratedReport');
      }
    }
  }, []);

  // Load draft if available
  useEffect(() => {
    try {
      const draftRaw = localStorage.getItem('createReportDraft');
      if (draftRaw && !aiGeneratedData) {
        const draft = JSON.parse(draftRaw);
        if (draft?.formData) setFormData(draft.formData);
        if (draft?.location) setLocation(draft.location);
      }
    } catch {}
  }, [aiGeneratedData]);

  // Autosave draft (form data + location)
  useEffect(() => {
    const payload = JSON.stringify({ formData, location });
    localStorage.setItem('createReportDraft', payload);
  }, [formData, location]);

  // Mark dirty on changes
  useEffect(() => {
    setIsDirty(true);
  }, [formData.title, formData.description, formData.category, formData.priority, location, uploadedImages.length]);

  // Warn on navigation if there are unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty && !submitSuccess) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty, submitSuccess]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (!e.target.files || e.target.files.length === 0) return;
    
    const files = Array.from(e.target.files);
    safeTrack('report_images_selected', { count: files.length });
    
    // Check if adding new files would exceed the limit
    if (uploadedImages.length + files.length > MAX_IMAGES) {
      setUploadError(`You can only upload up to ${MAX_IMAGES} images`);
      safeTrack('report_images_too_many', { selected: files.length, existing: uploadedImages.length });
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
      safeTrack('report_images_invalid', { invalidCount: invalidFiles.length });
      return;
    }

    setUploadedImages(prev => [...prev, ...files]);
    safeTrack('report_images_added', { total: uploadedImages.length + files.length });
    
    // Create preview URLs
    const newPreviewUrls = files.map(file => URL.createObjectURL(file));
    setImagePreviewUrls(prev => [...prev, ...newPreviewUrls]);
  };

  // Map raw errors to user-friendly messages
  const mapFriendlyError = (error: unknown): string => {
    const msg = error instanceof Error ? error.message : String(error || 'Unknown error');
    if (/CLOUDINARY_NOT_CONFIGURED|CLOUDINARY_CONFIG_ERROR/i.test(msg)) return 'Image service is temporarily unavailable. Please try again later.';
    if (/FILE_TOO_LARGE|TOTAL_SIZE_EXCEEDED/i.test(msg)) return 'One or more images are too large. Please choose smaller images.';
    if (/INVALID_FILE_TYPE/i.test(msg)) return 'Unsupported image type. Please upload JPEG, PNG, GIF, or WebP.';
    if (/row level security|RLS|not allowed/i.test(msg)) return 'You are not allowed to perform this action. Please sign in and try again.';
    if (/Failed to fetch|NetworkError|timeout|ECONN/i.test(msg)) return 'Network issue encountered. Please check your connection and try again.';
    return msg || 'Failed to submit report. Please try again.';
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

      // Handle AI-generated images (already uploaded to Cloudinary)
      if (aiGeneratedData && aiGeneratedData.imageUrls.length > 0) {
        console.log('🤖 Using AI-generated images:', aiGeneratedData.imageUrls);
        imageUrls = [...aiGeneratedData.imageUrls];
      }

      // Upload additional images (both uploaded files and captured photos) together
      if (uploadedImages.length > 0) {
        setCurrentStep('Uploading photos');
        safeTrack('report_submit_step', { step: 'upload_photos', count: uploadedImages.length });
        console.log('🚀 Starting upload of', uploadedImages.length, 'additional images...');
        console.log('📁 Files to upload:', uploadedImages.map(f => ({ name: f.name, size: f.size, type: f.type })));
        
        const additionalImageUrls = await uploadMultipleImages(uploadedImages);
        console.log('✅ Additional upload completed. URLs:', additionalImageUrls);
        
        // Combine AI-generated images with additional uploaded images
        imageUrls = [...imageUrls, ...additionalImageUrls];
      }

      console.log('📸 Final image URLs:', imageUrls);

      const reportData = {
        user_id: user.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        priority: formData.priority,
        // auto-derive on client as well for robustness (service also derives)
        priority_level: (formData.priority === 'high' ? 5 : formData.priority === 'medium' ? 3 : 1),
        location_lat: location.lat,
        location_lng: location.lng,
        location_address: location.address || `${location.lat}, ${location.lng}`,
        images: imageUrls,
        idempotency_key: `rep_${user.id}_${Date.now()}`,
      };

      console.log('📤 Submitting report with data:', reportData);

      // Create the report and get the real ID
      setCurrentStep('Creating report');
      safeTrack('report_submit_step', { step: 'create_report' });
      const createdReport = await (async () => {
        // Basic retry for transient failures
        let attempts = 0; let lastErr: any;
        while (attempts < 3) {
          attempts++;
          try { return await reportsService.createReport(reportData); } catch (e) { lastErr = e; await new Promise(r => setTimeout(r, attempts * 500)); }
        }
        throw lastErr;
      })();
      console.log('✅ Report created successfully:', createdReport);

      // Award points with the real report ID
      try {
        setCurrentStep('Awarding points');
        await awardPoints(user.id, 'REPORT_SUBMITTED', createdReport.id);
        console.log('🎯 Points awarded successfully');
        safeTrack('report_submit_points_awarded', { reportId: createdReport.id });
      } catch (error) {
        console.error('❌ Error awarding points:', error);
        safeTrack('report_submit_points_failed');
        // Don't throw here, as the report was still created successfully
      }

      // Track report creation for achievements/stats
      try {
        setCurrentStep('Recording activity');
        await activityService.trackReportCreated(user.id, createdReport.id);
        safeTrack('report_submit_tracked', { reportId: createdReport.id });
      } catch (error) {
        console.error('❌ Error tracking report creation:', error);
        safeTrack('report_submit_track_failed');
      }

      // Clean up preview URLs
      imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));

      // Stash for optimistic render on the list page
      try { sessionStorage.setItem('optimisticReport', JSON.stringify(createdReport)); } catch {}

      // Show success modal and redirect shortly after
      setSubmitSuccess(true);
      setIsDirty(false);
      localStorage.removeItem('createReportDraft');
      safeTrack('report_submit_succeeded', { reportId: createdReport.id });
      setTimeout(() => {
        navigate('/reports');
      }, 1500);
      
    } catch (error) {
      console.error('❌ Error creating report:', error);
      const friendly = mapFriendlyError(error);
      setUploadError(friendly);
      setSubmitError(friendly);
      safeTrack('report_submit_failed', { message: friendly });
      if (!navigator.onLine) {
        enqueueReport({
          user_id: user.id,
          title: formData.title.trim(),
          description: formData.description.trim(),
          category: formData.category,
          priority: formData.priority,
          priority_level: (formData.priority === 'high' ? 5 : formData.priority === 'medium' ? 3 : 1),
          location_lat: location!.lat,
          location_lng: location!.lng,
          location_address: location!.address || `${location!.lat}, ${location!.lng}`,
          images: [],
        });
      }
    } finally {
      setIsSubmitting(false);
      setCurrentStep(null);
    }
  };

  // Try to flush queued reports when the app goes online
  useEffect(() => {
    const onOnline = async () => { try { await flushQueuedReports(); } catch {} };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

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

  // Success modal is rendered inline below when submitSuccess is true

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-gray-50 to-gray-100 py-6 sm:py-8">
      <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 text-white">
            <h1 className="text-3xl font-bold">Create New Report</h1>
            <p className="text-blue-100 mt-2">Help improve your community by reporting issues</p>
          </div>

          {/* Form Content */}
          <div className="p-6 sm:p-8">
            {/* AI Generated Report Indicator */}
            {aiGeneratedData && (
              <div className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-2 rounded-lg">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-purple-800 flex items-center space-x-2">
                      <span>AI-Generated Report</span>
                      <Sparkles className="h-4 w-4 text-yellow-500" />
                    </h3>
                    <p className="text-sm text-purple-700 mt-1">
                      This report was automatically generated using AI analysis. You can review and edit the details below.
                    </p>
                  </div>
                </div>
              </div>
            )}

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
                      <div className="text-sm text-green-800">
                        <p>
                          <span className="font-medium">Selected:</span> {location.address || `${location.lat}, ${location.lng}`}
                        </p>
                        <p className="mt-1 text-green-900">
                          <span className="font-medium">Lat/Lng:</span> {Number.isFinite(location.lat) ? location.lat.toFixed(6) : location.lat}, {Number.isFinite(location.lng) ? location.lng.toFixed(6) : location.lng}
                        </p>
                      </div>
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
                    ref={submitButtonRef}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                        {currentStep || 'Submitting...'}
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

        {submitSuccess && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="report-success-title">
            <FocusTrap>
            <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl p-8 text-center animate-slide-up" tabIndex={0}>
              <div className="mx-auto mb-4 relative h-16 w-16">
                <span className="absolute inset-0 rounded-full bg-green-100 animate-ping"></span>
                <div className="relative h-16 w-16 rounded-full bg-green-600 flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-white" />
                </div>
              </div>
              <h3 id="report-success-title" className="text-xl font-semibold text-gray-900 mb-1">Report submitted</h3>
              <p className="text-gray-600 mb-6">Thank you for helping improve your community.</p>
              <div className="flex items-center justify-center space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setSubmitSuccess(false);
                    if (submitButtonRef.current) submitButtonRef.current.focus();
                  }}
                  className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                >
                  Close
                </button>
              </div>
            </div>
            </FocusTrap>
          </div>
        )}

        {submitError && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="report-fail-title">
            <FocusTrap>
            <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl p-8 text-center animate-slide-up" tabIndex={0}>
              <div className="mx-auto mb-4 relative h-16 w-16">
                <span className="absolute inset-0 rounded-full bg-red-100 animate-ping"></span>
                <div className="relative h-16 w-16 rounded-full bg-red-600 flex items-center justify-center">
                  <AlertCircle className="h-10 w-10 text-white" />
                </div>
              </div>
              <h3 id="report-fail-title" className="text-xl font-semibold text-gray-900 mb-1">Submission failed</h3>
              <p className="text-gray-600 mb-4">{submitError}</p>
              <div className="flex items-center justify-center space-x-3">
                <button
                  type="button"
                  onClick={() => setSubmitError(null)}
                  className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitError(null);
                    if (submitButtonRef.current) submitButtonRef.current.focus();
                    navigate('/create-report');
                  }}
                  className="px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
                >
                  Try again
                </button>
              </div>
            </div>
            </FocusTrap>
          </div>
        )}
      </div>
    </div>
  );
}