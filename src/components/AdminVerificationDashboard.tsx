import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Mail, 
  Phone,
  Calendar,
  Eye,
  AlertTriangle,
  Check,
  X,
  Loader2,
  Filter,
  Search
} from 'lucide-react';
import { getApiUrl } from '../lib/config';
import { authenticatedRequest } from '../lib/jwt';
import { ImageViewer } from './ImageViewer';

interface VerificationRequest {
  id: string;
  user_id: string;
  id_front_image_url: string;
  id_back_image_url: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  processed_by?: string;
  processed_at?: string;
  created_at: string;
  user_profile?: {
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
  };
}

export function AdminVerificationDashboard() {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedImageTitle, setSelectedImageTitle] = useState<string>('');
  const [imageLoadingStates, setImageLoadingStates] = useState<{[key: string]: boolean}>({});
  const [fullScreenImageLoading, setFullScreenImageLoading] = useState(false);

  // Helper function to get image URL (now using Cloudinary directly)
  const getImageUrl = (imageUrl: string) => {
    if (!imageUrl) {
      console.log('❌ No image URL provided');
      return '';
    }
    
    console.log('🔍 getImageUrl called with:', imageUrl);
    
    // If it's already a Cloudinary URL, use it directly
    if (imageUrl.includes('cloudinary.com')) {
      console.log('✅ Using Cloudinary URL directly');
      return imageUrl;
    }
    
    // If it's a Supabase storage URL, try to use it directly first
    // If it fails, the onError handler will show a placeholder
    if (imageUrl.includes('supabase.co')) {
      console.log('⚠️ Supabase URL detected, trying direct access');
      return imageUrl;
    }
    
    // Fallback to original URL
    console.log('🔄 Using fallback URL');
    return imageUrl;
  };

  // Function to open image in full screen
  const openImageModal = (imageUrl: string, title: string) => {
    console.log('🖼️ Opening image modal for:', imageUrl);
    const fullImageUrl = getImageUrl(imageUrl);
    console.log('🖼️ Processed URL for modal:', fullImageUrl);
    if (fullImageUrl) {
      setFullScreenImageLoading(true);
      setSelectedImageUrl(fullImageUrl);
      setSelectedImageTitle(title);
      setShowImageModal(true);
    }
  };

  // Reset loading states when modal opens
  useEffect(() => {
    if (showModal && selectedRequest) {
      setImageLoadingStates({});
    }
  }, [showModal, selectedRequest]);

  // Reset full-screen loading state when image modal closes
  useEffect(() => {
    if (!showImageModal) {
      setFullScreenImageLoading(false);
    }
  }, [showImageModal]);

  // Fetch verification requests
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await authenticatedRequest(getApiUrl('/api/admin/verification-requests'), {
        method: 'GET'
      });
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
      } else {
        console.error('Failed to fetch verification requests:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching verification requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Filter requests based on status and search term
  const filteredRequests = requests.filter(request => {
    const matchesFilter = filter === 'all' || request.status === filter;
    const matchesSearch = searchTerm === '' || 
      request.user_profile?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.user_profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.user_profile?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.user_profile?.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  // Handle AI analysis

  // Handle verification decision
  const handleVerification = async (requestId: string, decision: 'approved' | 'rejected', notes?: string) => {
    try {
      setProcessing(requestId);
      
      const response = await authenticatedRequest(getApiUrl('/api/admin/verify-user'), {
        method: 'POST',
        body: JSON.stringify({
          requestId,
          decision,
          notes
        }),
      });

      if (response.ok) {
        // Update local state
        setRequests(prev => prev.map(req => 
          req.id === requestId 
            ? { ...req, status: decision, admin_notes: notes }
            : req
        ));
        setShowModal(false);
        setSelectedRequest(null);
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to process verification');
      }
    } catch (error) {
      console.error('Error processing verification:', error);
      alert('Failed to process verification');
    } finally {
      setProcessing(null);
    }
  };

  // Get status icon and color
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' };
      case 'approved':
        return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' };
      case 'rejected':
        return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' };
      default:
        return { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="h-8 w-8 text-red-800" />
          <h1 className="text-3xl font-bold text-gray-900">ID Verification Dashboard</h1>
        </div>
        <p className="text-gray-600">Review and verify user ID submissions for account approval</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">
                {requests.filter(r => r.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-gray-900">
                {requests.filter(r => r.status === 'approved').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-gray-900">
                {requests.filter(r => r.status === 'rejected').length}
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === status
                    ? 'bg-red-800 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading verification requests...</span>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No verification requests found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRequests.map((request) => {
                  const statusInfo = getStatusInfo(request.status);
                  const StatusIcon = statusInfo.icon;
                  
                  return (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <User className="h-5 w-5 text-gray-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {request.user_profile?.first_name} {request.user_profile?.last_name}
                            </div>
                            <div className="text-sm text-gray-500">{request.user_profile?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(request.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.ai_confidence ? (
                          <div className="flex items-center">
                            <span className="text-sm font-medium">
                              {Math.round(request.ai_confidence)}%
                            </span>
                            {request.ai_confidence >= 80 && (
                              <CheckCircle className="h-4 w-4 text-green-500 ml-1" />
                            )}
                            {request.ai_confidence < 80 && request.ai_confidence >= 60 && (
                              <AlertTriangle className="h-4 w-4 text-yellow-500 ml-1" />
                            )}
                            {request.ai_confidence < 60 && (
                              <XCircle className="h-4 w-4 text-red-500 ml-1" />
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">No AI analysis</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowModal(true);
                            }}
                            className="text-red-800 hover:text-red-900 flex items-center gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            Review
                          </button>
                          {request.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleVerification(request.id, 'approved')}
                                disabled={processing === request.id}
                                className="text-green-600 hover:text-green-700 flex items-center gap-1 disabled:opacity-50"
                              >
                                <Check className="h-4 w-4" />
                                Approve
                              </button>
                              <button
                                onClick={() => handleVerification(request.id, 'rejected')}
                                disabled={processing === request.id}
                                className="text-red-600 hover:text-red-700 flex items-center gap-1 disabled:opacity-50"
                              >
                                <X className="h-4 w-4" />
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Review ID Verification</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">User Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {selectedRequest.user_profile?.first_name} {selectedRequest.user_profile?.last_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <span className="text-sm text-gray-600">{selectedRequest.user_profile?.email}</span>
                    </div>
                    {selectedRequest.user_profile?.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-gray-400" />
                        <span className="text-sm text-gray-600">{selectedRequest.user_profile.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        Submitted: {new Date(selectedRequest.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>


                  {/* No ID Images Warning */}
                  {!selectedRequest.id_front_image_url && !selectedRequest.id_back_image_url && (
                    <div className="mt-6">
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-semibold text-amber-800">No ID Images Uploaded</h4>
                            <p className="text-sm text-amber-700 mt-1">
                              This user has not uploaded ID images yet. You can still approve their account 
                              if they have provided sufficient information through other means, or ask them 
                              to upload their ID images for verification.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ID Images */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">ID Images</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Front of ID</h4>
                      {selectedRequest.id_front_image_url ? (
                        <div 
                          className="cursor-pointer group relative bg-white rounded-lg border border-gray-200 group-hover:border-blue-300 transition-colors"
                          onClick={() => openImageModal(selectedRequest.id_front_image_url, 'Front of ID')}
                          style={{ height: '192px', width: '100%' }}
                        >
                          {imageLoadingStates[`front-${selectedRequest.id}`] && (
                            <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center z-10">
                              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                            </div>
                          )}
                          <div className="w-full h-full flex items-center justify-center p-2">
                            <img
                              src={getImageUrl(selectedRequest.id_front_image_url)}
                              alt="Front of ID"
                              className="max-w-full max-h-full object-contain"
                              style={{ 
                                maxWidth: '100%',
                                maxHeight: '100%',
                                objectFit: 'contain'
                              }}
                              onLoadStart={() => {
                                setImageLoadingStates(prev => ({...prev, [`front-${selectedRequest.id}`]: true}));
                                console.log('🔄 Front image loading started');
                              }}
                              onLoad={(e) => {
                                setImageLoadingStates(prev => ({...prev, [`front-${selectedRequest.id}`]: false}));
                                console.log('✅ Front image loaded successfully');
                                console.log('🖼️ Front image dimensions:', e.currentTarget.naturalWidth, 'x', e.currentTarget.naturalHeight);
                                console.log('🖼️ Front image display size:', e.currentTarget.offsetWidth, 'x', e.currentTarget.offsetHeight);
                              }}
                              onError={(e) => {
                                setImageLoadingStates(prev => ({...prev, [`front-${selectedRequest.id}`]: false}));
                                console.error('❌ Failed to load front ID image:', selectedRequest.id_front_image_url);
                                console.error('❌ Processed URL was:', getImageUrl(selectedRequest.id_front_image_url));
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          </div>
                          <div className="absolute inset-0 bg-transparent group-hover:bg-black group-hover:bg-opacity-10 transition-all rounded-lg flex items-center justify-center pointer-events-none">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white bg-opacity-90 px-3 py-1 rounded-full text-sm font-medium pointer-events-auto">
                              Click to view full size
                            </div>
                          </div>
                          {/* Fallback for failed image load */}
                          <div className="hidden w-full h-48 bg-gray-100 rounded-lg border border-gray-200 items-center justify-center">
                            <div className="text-center">
                              <AlertTriangle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-500">Image failed to load</p>
                              <p className="text-xs text-gray-400 mt-1">Click to try viewing</p>
                            </div>
                          </div>
                        </div>
                      ) : null}
                      {!selectedRequest.id_front_image_url && (
                        <div className="w-full h-48 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                          <div className="text-center">
                            <AlertTriangle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">No front ID image uploaded</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Back of ID</h4>
                      {selectedRequest.id_back_image_url ? (
                        <div 
                          className="cursor-pointer group relative bg-white rounded-lg border border-gray-200 group-hover:border-blue-300 transition-colors"
                          onClick={() => openImageModal(selectedRequest.id_back_image_url, 'Back of ID')}
                          style={{ height: '192px', width: '100%' }}
                        >
                          {imageLoadingStates[`back-${selectedRequest.id}`] && (
                            <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center z-10">
                              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                            </div>
                          )}
                          <div className="w-full h-full flex items-center justify-center p-2">
                            <img
                              src={getImageUrl(selectedRequest.id_back_image_url)}
                              alt="Back of ID"
                              className="max-w-full max-h-full object-contain"
                              style={{ 
                                maxWidth: '100%',
                                maxHeight: '100%',
                                objectFit: 'contain'
                              }}
                              onLoadStart={() => {
                                setImageLoadingStates(prev => ({...prev, [`back-${selectedRequest.id}`]: true}));
                                console.log('🔄 Back image loading started');
                              }}
                              onLoad={(e) => {
                                setImageLoadingStates(prev => ({...prev, [`back-${selectedRequest.id}`]: false}));
                                console.log('✅ Back image loaded successfully');
                                console.log('🖼️ Back image dimensions:', e.currentTarget.naturalWidth, 'x', e.currentTarget.naturalHeight);
                                console.log('🖼️ Back image display size:', e.currentTarget.offsetWidth, 'x', e.currentTarget.offsetHeight);
                              }}
                              onError={(e) => {
                                setImageLoadingStates(prev => ({...prev, [`back-${selectedRequest.id}`]: false}));
                                console.error('❌ Failed to load back ID image:', selectedRequest.id_back_image_url);
                                console.error('❌ Processed URL was:', getImageUrl(selectedRequest.id_back_image_url));
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          </div>
                          <div className="absolute inset-0 bg-transparent group-hover:bg-black group-hover:bg-opacity-10 transition-all rounded-lg flex items-center justify-center pointer-events-none">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white bg-opacity-90 px-3 py-1 rounded-full text-sm font-medium pointer-events-auto">
                              Click to view full size
                            </div>
                          </div>
                          {/* Fallback for failed image load */}
                          <div className="hidden w-full h-48 bg-gray-100 rounded-lg border border-gray-200 items-center justify-center">
                            <div className="text-center">
                              <AlertTriangle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-500">Image failed to load</p>
                              <p className="text-xs text-gray-400 mt-1">Click to try viewing</p>
                            </div>
                          </div>
                        </div>
                      ) : null}
                      {!selectedRequest.id_back_image_url && (
                        <div className="w-full h-48 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                          <div className="text-center">
                            <AlertTriangle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">No back ID image uploaded</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between">
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  {selectedRequest.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleVerification(selectedRequest.id, 'rejected')}
                        disabled={processing === selectedRequest.id}
                        className="px-4 py-2 text-red-700 bg-red-100 border border-red-300 rounded-lg hover:bg-red-200 disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleVerification(selectedRequest.id, 'approved')}
                        disabled={processing === selectedRequest.id}
                        className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        Approve
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Full-screen Image Modal */}
      {showImageModal && selectedImageUrl && (
        <ImageViewer
          isOpen={showImageModal}
          onClose={() => setShowImageModal(false)}
          imageUrl={selectedImageUrl}
          alt={selectedImageTitle}
        />
      )}
    </div>
  );
}
