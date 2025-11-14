import React, { useState, useEffect } from 'react';
// Analytics (vercel) removed — provide a safe no-op tracker to avoid build-time errors
import { useNavigate } from 'react-router-dom';
import { Camera, MapPin, Loader2, AlertCircle, X, CheckCircle, Upload, Bot, Sparkles, Trophy, Construction, Shield, Leaf, Building2, HelpCircle, ChevronRight, EyeOff, Eye } from 'lucide-react';
import { MapPicker } from '../components/MapPicker';
import { MobileBackToReports } from '../components/MobileBackToReports';
import { useAuthStore } from '../store/authStore';
import { uploadMultipleImages } from '../lib/cloudinaryStorage';
import { awardPoints } from '../lib/points';
import { useToastContext } from '../contexts/ToastContext';
import { useVerificationStatus } from '../hooks/useVerificationStatus';

// Points awarded when a report is verified by admin
const POINTS_FOR_REPORT = 25;
import { reportsService } from '../services/reportsService';
import { activityService } from '../services/activityService';
import { enqueueReport, flushQueuedReports } from '../lib/offlineQueue';
import { FocusTrap } from '../components/FocusTrap';
import { PhotoCapture } from '../components/PhotoCapture';

const CATEGORIES = [
  { 
    value: 'infrastructure', 
    label: 'Infrastructure', 
    icon: Construction,
    description: 'Roads, sidewalks, bridges, and public structures',
    color: 'text-orange-600'
  },
  { 
    value: 'safety', 
    label: 'Safety', 
    icon: Shield,
    description: 'Street lights, traffic signs, and public safety concerns',
    color: 'text-red-600'
  },
  { 
    value: 'environmental', 
    label: 'Environmental', 
    icon: Leaf,
    description: 'Pollution, waste management, and green spaces',
    color: 'text-green-600'
  },
  { 
    value: 'public services', 
    label: 'Public Services', 
    icon: Building2,
    description: 'Utilities, sanitation, and community services',
    color: 'text-blue-600'
  },
  { 
    value: 'other', 
    label: 'Other', 
    icon: HelpCircle,
    description: 'Issues not covered by other categories',
    color: 'text-gray-600'
  }
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800 border-green-400', description: 'Minor issue, no immediate danger' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800 border-yellow-400', description: 'Needs attention, moderate impact' },
  { value: 'high', label: 'High', color: 'bg-red-100 text-red-800 border-red-400', description: 'Urgent, requires immediate action' }
];

const MAX_IMAGES = 5;

export function CreateReport() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isPending } = useVerificationStatus();
  const { success: showToastSuccess, error: showToastError } = useToastContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Check if user is pending verification - they cannot create reports
  useEffect(() => {
    if (isPending) {
      showToastError('Your account is pending verification. You cannot create reports until your account is approved by an admin.', 5000);
      navigate('/reports', { replace: true });
    }
  }, [isPending, navigate, showToastError]);
  
  // Detect mobile/PWA environment
  const [isMobileOrPWA, setIsMobileOrPWA] = useState(false);
  
  useEffect(() => {
    const checkMobileOrPWA = () => {
      const isMobile = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                   (window.navigator as any).standalone === true ||
                   document.referrer.includes('android-app://');
      setIsMobileOrPWA(isMobile || isPWA);
    };
    
    checkMobileOrPWA();
    window.addEventListener('resize', checkMobileOrPWA);
    
    return () => window.removeEventListener('resize', checkMobileOrPWA);
  }, []);
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
  const [activeFormStep, setActiveFormStep] = useState(1);
  const [isAnonymous, setIsAnonymous] = useState(false); // Anonymous reporting toggle
  const submitButtonRef = React.useRef<HTMLButtonElement | null>(null);
  
  // Calculate word count for description
  const wordCount = formData.description.trim() ? formData.description.trim().split(/\s+/).length : 0;
  const safeTrack = (name: string, props?: Record<string, any>) => {
    try {
      // If an analytics implementation is present on window, call it. Otherwise no-op.
      // This keeps instrumentation calls in place without forcing a hard dependency.
      const globalTrack = (window as any)?.__VERCEL_ANALYTICS__?.track || (window as any)?.analytics?.track;
      const stepEvent = name === 'report_submit_step';
      if (stepEvent && Math.random() > 0.3) return;
      if (typeof globalTrack === 'function') globalTrack(name, props);
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
    // Mark as initialized to prevent loading flash
    setIsInitialized(true);
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

    // Validate coordinates are valid numbers
    if (typeof location.lat !== 'number' || typeof location.lng !== 'number' || 
        !Number.isFinite(location.lat) || !Number.isFinite(location.lng) ||
        location.lat === 0 && location.lng === 0) {
      alert('Invalid location coordinates. Please select a valid location on the map.');
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
        is_anonymous: isAnonymous, // Include anonymous flag
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

      // Points will be awarded when the report is verified by admin
      console.log('📝 Report submitted - points will be awarded after verification');
      safeTrack('report_submit_no_points', { reportId: createdReport.id });

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
      showToastSuccess(`Report submitted successfully! Case #${createdReport.case_number || createdReport.id.slice(0, 8)}`, 4000);
      setTimeout(() => {
        navigate('/reports');
      }, 1500);
      
    } catch (error) {
      console.error('❌ Error creating report:', error);
      const friendly = mapFriendlyError(error);
      setUploadError(friendly);
      setSubmitError(friendly);
      showToastError(friendly, 5000);
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
      <div className="space-y-3">
        {/* Upload Buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => setShowPhotoCapture(true)}
            disabled={remainingSlots <= 0}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2.5 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2 text-sm font-semibold shadow-sm"
          >
            <Camera className="h-4 w-4" />
            <span>Capture</span>
          </button>
          <label className={`flex-1 ${remainingSlots <= 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 cursor-pointer'} text-white px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 text-sm font-semibold shadow-sm`}>
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

        {/* Photo count indicator */}
        <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-1.5">
            <Camera className="h-4 w-4 text-gray-600" />
            <span className="text-xs font-semibold text-gray-700">
              {uploadedImages.length}/{MAX_IMAGES} photos
            </span>
          </div>
          {uploadedImages.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setUploadedImages([]);
                setImagePreviewUrls([]);
                setUploadError(null);
              }}
              className="text-xs text-red-600 hover:text-red-700 font-semibold"
            >
              Clear
            </button>
          )}
        </div>

        {/* Image previews */}
        {imagePreviewUrls.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
            {imagePreviewUrls.map((url, index) => (
              <div key={index} className="relative group">
                <img
                  src={url}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-20 object-cover rounded-lg shadow-sm border border-gray-200 group-hover:border-blue-400 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600 shadow-md"
                >
                  <X className="h-3 w-3" />
                </button>
                <div className="absolute bottom-1 left-1 bg-black bg-opacity-60 text-white text-xs px-1.5 py-0.5 rounded">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {imagePreviewUrls.length === 0 && (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50">
            <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 font-medium">No photos added</p>
            <p className="text-xs text-gray-500 mt-1">Photos help address issues faster</p>
          </div>
        )}

        {/* Upload error */}
        {uploadError && (
          <div className="text-red-700 text-xs bg-red-50 p-3 rounded-lg border border-red-300">
            <div className="flex items-center space-x-1.5">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="font-medium">{uploadError}</span>
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

  // Step progress indicator
  const steps = [
    { number: 1, title: 'Details', completed: formData.title && formData.category && formData.description },
    { number: 2, title: 'Location', completed: location !== null },
    { number: 3, title: 'Photos', completed: imagePreviewUrls.length > 0 },
    { number: 4, title: 'Review', completed: false }
  ];

  return (
    <>
      <MobileBackToReports />
      <div className="min-h-[100dvh] bg-gradient-to-br from-blue-50 via-gray-50 to-purple-50 py-4 sm:py-6">
      <div className="w-full max-w-5xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-purple-600 px-5 sm:px-6 lg:px-8 py-5 sm:py-6 lg:py-7 text-white">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1.5">Create New Report</h1>
            <p className="text-blue-100 text-sm sm:text-base">Help improve your community by reporting civic issues</p>
          </div>

          {/* Step Progress Indicator */}
          <div className="bg-gray-50 px-4 sm:px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between max-w-3xl mx-auto">
              {steps.map((step, index) => (
                <React.Fragment key={step.number}>
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm transition-all duration-300 ${
                      step.completed 
                        ? 'bg-green-500 text-white shadow-md' 
                        : activeFormStep >= step.number 
                          ? 'bg-blue-600 text-white shadow-sm' 
                          : 'bg-gray-200 text-gray-500'
                    }`}>
                      {step.completed ? <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" /> : step.number}
                    </div>
                    <span className={`mt-1.5 text-xs font-medium hidden sm:block ${
                      activeFormStep >= step.number ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 sm:mx-2 rounded transition-all duration-300 ${
                      step.completed ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Form Content - Two Column Layout */}
          <div className="p-4 sm:p-5 lg:p-6">
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

            <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-6">
              {/* Report Details Section - Full Width */}
              <div className="space-y-4">
                  
                  {/* Report Details Header */}
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">1</div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-gray-900">Report Details</h2>
                      <p className="text-xs text-gray-600">Tell us about the issue</p>
                    </div>
                  </div>
                
                <div className="bg-gradient-to-br from-primary-50/30 to-white rounded-2xl p-5 sm:p-6 border-2 border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 space-y-5">
                  <div>
                    <label htmlFor="title-input" className="block text-sm font-semibold text-text-primary mb-3">
                      Issue Title <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="title-input"
                        type="text"
                        required
                        className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md placeholder-gray-400"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Brief description of the issue..."
                      />
                      {formData.title && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Enhanced Category Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-text-primary mb-3">
                      Category <span className="text-red-500">*</span>
                    </label>
                    
                    {isMobileOrPWA ? (
                      // Mobile/PWA: Enhanced dropdown selection
                      <div className="relative">
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="w-full px-4 py-4 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white transition-all duration-200 shadow-sm hover:shadow-md appearance-none cursor-pointer"
                          required
                        >
                          <option value="" disabled className="text-gray-500">
                            🏛️ Select a category...
                          </option>
                          <option value="infrastructure" className="py-2">
                            🏗️ Infrastructure - Roads, sidewalks, bridges, and public structures
                          </option>
                          <option value="safety" className="py-2">
                            🛡️ Safety - Street lights, traffic signs, and public safety concerns
                          </option>
                          <option value="environmental" className="py-2">
                            🌱 Environmental - Pollution, waste management, and green spaces
                          </option>
                          <option value="public services" className="py-2">
                            🏢 Public Services - Utilities, sanitation, and community services
                          </option>
                          <option value="other" className="py-2">
                            ❓ Other - Issues not covered by other categories
                          </option>
                        </select>
                        {/* Custom dropdown arrow */}
                        <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                          <ChevronRight className="h-5 w-5 text-gray-400 transform rotate-90" />
                        </div>
                        {/* Selected category indicator */}
                        {formData.category && (
                          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                            <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                          </div>
                        )}
                      </div>
                    ) : (
                      // Desktop: Button grid selection
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {CATEGORIES.map((category) => {
                          const Icon = category.icon;
                          const isSelected = formData.category === category.value;
                          return (
                            <button
                              key={category.value}
                              type="button"
                              onClick={() => setFormData({ ...formData, category: category.value })}
                              className={`text-left p-3 rounded-lg border-2 transition-all duration-200 ${
                                isSelected
                                  ? 'border-primary-600 bg-primary-100 shadow-md ring-2 ring-primary-300 scale-[1.02]'
                                  : 'border-gray-200 bg-white hover:border-primary-300 hover:shadow-sm'
                              }`}
                            >
                              <div className="flex items-start space-x-2">
                                <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isSelected ? 'text-primary-700' : category.color}`} />
                                <div className="flex-1 min-w-0">
                                  <div className={`text-sm font-semibold ${isSelected ? 'text-primary-900' : 'text-gray-900'}`}>
                                    {category.label}
                                    {isSelected && <span className="ml-2 text-primary-600">✓</span>}
                                  </div>
                                  <div className={`text-xs mt-0.5 ${isSelected ? 'text-primary-800' : 'text-gray-600'}`}>
                                    {category.description}
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  {/* Enhanced Priority Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-text-primary mb-3">
                      Priority Level <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {PRIORITY_OPTIONS.map((option) => {
                        const isSelected = formData.priority === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, priority: option.value as 'low' | 'medium' | 'high' })}
                            className={`text-center p-2.5 rounded-lg border-2 transition-all duration-200 ${
                              isSelected
                                ? `${option.color} border-current shadow-lg ring-2 ring-opacity-50 scale-105`
                                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                            }`}
                          >
                            <div className={`font-bold text-sm ${isSelected ? '' : 'text-gray-700'}`}>
                              {option.label}
                              {isSelected && <span className="ml-1">✓</span>}
                            </div>
                            <div className={`text-xs mt-0.5 leading-tight ${isSelected ? '' : 'text-gray-600'}`}>
                              {option.description}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Enhanced Description with Word Count */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-semibold text-text-primary">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <span className="text-xs text-text-secondary font-medium bg-gray-100 px-2 py-1 rounded-full">
                        {wordCount} {wordCount === 1 ? 'word' : 'words'}
                      </span>
                    </div>
                    <div className="relative">
                      <textarea
                        required
                        rows={4}
                        className="w-full px-4 py-4 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 resize-y shadow-sm hover:shadow-md placeholder-gray-400"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Provide a detailed description of the issue, including location details, time of occurrence, and any other relevant information..."
                        minLength={10}
                      />
                      {formData.description.length >= 10 && (
                        <div className="absolute top-4 right-4">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-text-secondary flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Minimum 10 characters required
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Location Section - Full Width */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-sm">2</div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">Location</h2>
                    <p className="text-xs text-gray-600">Pin the issue on map</p>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-primary-50/30 to-white rounded-2xl p-5 sm:p-6 border-2 border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 space-y-4">
                  <label className="block text-sm font-semibold text-text-primary">
                    Select Location <span className="text-red-500">*</span>
                  </label>
                  <div className="rounded-lg overflow-hidden border border-gray-300 shadow-sm">
                    <MapPicker 
                      onLocationSelect={setLocation} 
                      initialLocation={location || undefined}
                    />
                  </div>
                  {location && (
                      <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300 rounded-lg shadow-sm">
                        <div className="flex items-start space-x-2">
                          <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <div className="text-xs text-green-900 flex-1 min-w-0">
                            <p className="font-semibold break-words">
                              {location.address || 'Custom Location'}
                            </p>
                            <p className="mt-0.5 text-green-700">
                              {Number.isFinite(location.lat) ? location.lat.toFixed(6) : location.lat}, {Number.isFinite(location.lng) ? location.lng.toFixed(6) : location.lng}
                            </p>
                          </div>
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                        </div>
                      </div>
                    )}
                </div>
              </div>
              
              {/* Photos Section - Full Width */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-sm">3</div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">Photos</h2>
                    <p className="text-xs text-gray-600">Add up to 5 images</p>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-primary-50/30 to-white rounded-2xl p-5 sm:p-6 border-2 border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300">
                  {renderImageUploadSection()}
                </div>
              </div>
              
            {/* Anonymous Reporting Toggle */}
            <div className="mt-6 sm:mt-8 mb-5">
              <div className="max-w-4xl mx-auto">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5 shadow-sm">
                  <div className="flex items-start space-x-4">
                    <div className="flex items-center h-6 mt-0.5">
                      <input
                        id="anonymous-toggle"
                        type="checkbox"
                        checked={isAnonymous}
                        onChange={(e) => setIsAnonymous(e.target.checked)}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer transition-all"
                      />
                    </div>
                    <div className="flex-1">
                      <label htmlFor="anonymous-toggle" className="flex items-center space-x-2 cursor-pointer">
                        <div className="flex items-center space-x-2">
                          {isAnonymous ? (
                            <EyeOff className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Eye className="w-5 h-5 text-gray-600" />
                          )}
                          <span className="text-sm sm:text-base font-bold text-gray-900">
                            {isAnonymous ? 'Submit Anonymously' : 'Submit with your identity'}
                          </span>
                        </div>
                      </label>
                      <p className="text-xs sm:text-sm text-gray-700 mt-2 leading-relaxed">
                        {isAnonymous ? (
                          <>
                            <Shield className="w-4 h-4 inline-block text-blue-600 mr-1" />
                            <strong>Your identity will be hidden</strong> from public view. Only system administrators can see your information for moderation purposes. You won't earn points for anonymous reports.
                          </>
                        ) : (
                          <>
                            Your name and profile will be visible with this report. You'll earn {POINTS_FOR_REPORT} points for your contribution.
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* HORIZONTAL SECTION - Points Box & Submit Button Side by Side */}
            <div className="mb-4">
              {/* Decorative separator line */}
              <div className="flex items-center justify-center mb-5 sm:mb-6">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent max-w-2xl"></div>
              </div>
              
              {/* Horizontal Row - Points Box + Submit Button */}
              <div className="max-w-4xl mx-auto">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5 mb-3">
                  
                  {/* Compact Points Reward Box - Only show if NOT anonymous */}
                  {!isAnonymous && (
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-300 rounded-lg p-3.5 sm:p-4 shadow-sm flex items-center space-x-3 w-full sm:w-auto">
                      {/* Small Trophy Icon */}
                      <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-2 rounded-lg shadow-sm flex-shrink-0">
                        <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      
                      {/* Compact Message */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm sm:text-base font-bold text-gray-900">
                          Earn <span className="text-amber-600">{POINTS_FOR_REPORT} points</span> for your report!
                        </p>
                        <p className="text-xs text-amber-800 mt-0.5">
                          Help improve your community
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-8 py-3 text-base sm:text-lg bg-gradient-to-r from-blue-600 via-blue-700 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:via-blue-800 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center font-bold shadow-lg hover:shadow-xl whitespace-nowrap"
                    ref={submitButtonRef}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin -ml-1 mr-2.5 h-5 w-5" />
                        <span>{currentStep || 'Submitting...'}</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Report</span>
                        <ChevronRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </button>
                  
                </div>
                
                {/* Required fields note */}
                <p className="text-xs text-gray-600 text-center">
                  <span className="text-red-500 font-bold">*</span> Required fields must be completed
                </p>
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
          <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="report-success-title">
            <FocusTrap>
            <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-10 text-center animate-slide-up" tabIndex={0}>
              <div className="mx-auto mb-6 relative h-20 w-20">
                <span className="absolute inset-0 rounded-full bg-green-100 animate-ping"></span>
                <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-xl">
                  <CheckCircle className="h-12 w-12 text-white" />
                </div>
              </div>
              
              <h3 id="report-success-title" className="text-3xl font-bold text-gray-900 mb-2">Report Submitted!</h3>
              <p className="text-gray-600 mb-6 text-lg">Thank you for helping improve your community.</p>
              
              
              {/* Anonymous Confirmation - Only show if anonymous */}
              {isAnonymous && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-2xl p-6 mb-6">
                  <div className="flex items-center justify-center space-x-3 mb-2">
                    <Shield className="h-8 w-8 text-blue-600" />
                  </div>
                  <p className="text-blue-800 font-semibold">Anonymous Report Submitted</p>
                  <p className="text-xs text-blue-700 mt-1">Your identity is protected</p>
                </div>
              )}
              
              <div className="flex items-center justify-center space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setSubmitSuccess(false);
                    if (submitButtonRef.current) submitButtonRef.current.focus();
                  }}
                  className="px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
            </FocusTrap>
          </div>
        )}

        {submitError && (
          <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="report-fail-title">
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
    </>
  );
}