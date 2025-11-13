import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';
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
  Search
} from 'lucide-react';
import { getApiUrl } from '../lib/config';
import { authenticatedRequest } from '../lib/jwt';
import { ImageViewer } from './ImageViewer';
import { useToastContext } from '../contexts/ToastContext';

interface VerificationRequest {
  id: string;
  user_id: string;
  id_front_image_url: string;
  id_back_image_url: string;
  status: 'pending' | 'approved' | 'declined';
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
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'declined'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedImageTitle, setSelectedImageTitle] = useState<string>('');
  const [imageLoadingStates, setImageLoadingStates] = useState<{[key: string]: boolean}>({});
  const [fullScreenImageLoading, setFullScreenImageLoading] = useState(false);
  const { success: showToastSuccess, error: showToastError, info: showToastInfo } = useToastContext();

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

  const openUrlInNewTab = (url?: string) => {
    if (!url) return;
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.warn('Failed to open URL in new tab', e);
    }
  };

  const copyToClipboard = async (text?: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToastInfo('Copied to clipboard');
    } catch (e) {
      console.warn('Clipboard copy failed', e);
      showToastError('Failed to copy link');
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
        showToastError('Failed to load verification requests. Please refresh the page.', 5000);
      }
    } catch (error) {
      console.error('Error fetching verification requests:', error);
      showToastError('Error loading verification requests. Please try again.', 5000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Normalize status display (handle "rejected" as "declined")
  const normalizeStatus = (status: string): string => {
    if (status === 'rejected') return 'declined';
    return status;
  };

  // Filter requests based on status and search term
  const filteredRequests = requests.filter(request => {
    const normalizedStatus = normalizeStatus(request.status);
    const matchesFilter = filter === 'all' || normalizedStatus === filter;
    const matchesSearch = searchTerm === '' || 
      request.user_profile?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.user_profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.user_profile?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.user_profile?.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  // Show confirmation dialog before verification decision
  const confirmVerification = async (requestId: string, decision: 'approved' | 'declined', request?: VerificationRequest) => {
    const isApproved = decision === 'approved';
    const userName = request?.user_profile 
      ? `${request.user_profile.first_name} ${request.user_profile.last_name}` 
      : 'this user';
    const userEmail = request?.user_profile?.email || '';

    const result = await Swal.fire({
      title: isApproved ? 'Approve Verification?' : 'Decline Verification?',
      html: `
        <div style="text-align: left;">
          <p style="margin-bottom: 10px;"><strong>User:</strong> ${userName}</p>
          ${userEmail ? `<p style="margin-bottom: 10px;"><strong>Email:</strong> ${userEmail}</p>` : ''}
          <p style="margin-top: 15px; color: ${isApproved ? '#10b981' : '#dc2626'};">
            ${isApproved 
              ? 'This will approve the user\'s account and grant them full access to the platform.'
              : 'This will decline the user\'s verification request. Their ID images will be deleted for privacy.'
            }
          </p>
        </div>
      `,
      icon: isApproved ? 'question' : 'warning',
      showCancelButton: true,
      confirmButtonColor: isApproved ? '#10b981' : '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: isApproved ? 'Yes, Approve' : 'Yes, Decline',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      focusCancel: true,
      allowOutsideClick: false,
      allowEscapeKey: true
    });

    if (result.isConfirmed) {
      // User confirmed, proceed with verification
      await handleVerification(requestId, decision);
    }
  };

  // Handle verification decision
  const handleVerification = async (requestId: string, decision: 'approved' | 'declined', notes?: string) => {
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
        // Refresh the list to get updated data
        fetchRequests();
        // Show success toast
        const action = decision === 'approved' ? 'approved' : 'declined';
        showToastSuccess(`User verification ${action} successfully!`, 4000);
      } else {
        const error = await response.json();
        console.error('Verification error:', error);
        const errorMessage = error.details 
          ? `${error.error}: ${error.details}` 
          : error.error || error.message || 'Failed to process verification';
        showToastError(errorMessage, 6000);
      }
    } catch (error) {
      console.error('Error processing verification:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showToastError(`Failed to process verification: ${errorMessage}`, 6000);
    } finally {
      setProcessing(null);
    }
  };

  // Get status icon and color
  const getStatusInfo = (status: string) => {
    const normalizedStatus = normalizeStatus(status);
    switch (normalizedStatus) {
      case 'pending':
        return { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' };
      case 'approved':
        return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' };
      case 'declined':
        return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' };
      default:
        return { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

  // Format status for display
  const formatStatus = (status: string): string => {
    const normalized = normalizeStatus(status);
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4 sm:p-6 lg:p-8">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-red-600 rounded-xl shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-red-600 bg-clip-text text-transparent">ID Verification</h1>
            <p className="text-slate-600 text-sm mt-1">Review and approve user identity submissions</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all p-6 border-l-4 border-yellow-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Pending Reviews</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {requests.filter(r => r.status === 'pending').length}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-xl">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all p-6 border-l-4 border-green-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Approved</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {requests.filter(r => r.status === 'approved').length}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all p-6 border-l-4 border-red-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Declined</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {requests.filter(r => normalizeStatus(r.status) === 'declined').length}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-xl">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Search and Filter Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-2xl shadow-md p-6 mb-8"
      >
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email, or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 transition-all"
              />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'pending', 'approved', 'declined'] as const).map((status) => (
              <motion.button
                key={status}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  filter === status
                    ? 'bg-gradient-to-r from-blue-600 to-red-600 text-white shadow-lg'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Requests List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-2xl shadow-md overflow-hidden"
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="h-12 w-12 text-blue-600" />
            </motion.div>
            <span className="ml-4 text-slate-600 font-medium mt-4">Loading verification requests...</span>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
              <Shield className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-slate-900 font-semibold text-lg">No verification requests found</p>
            <p className="text-slate-500 text-sm mt-2">
              {searchTerm || filter !== 'all'
                ? `No requests match your ${searchTerm ? 'search' : 'filter'} criteria.`
                : 'All verification requests have been processed.'
              }
            </p>
            {(searchTerm || filter !== 'all') && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => {
                  setSearchTerm('');
                  setFilter('all');
                }}
                className="mt-4 px-6 py-2 text-blue-600 hover:text-blue-700 font-medium underline"
              >
                Clear filters
              </motion.button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Submitted</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredRequests.map((request, index) => {
                  const normalizedStatus = normalizeStatus(request.status);
                  const statusInfo = getStatusInfo(normalizedStatus);
                  const StatusIcon = statusInfo.icon;
                  
                  return (
                    <motion.tr
                      key={request.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-blue-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-semibold text-lg">
                              {request.user_profile?.first_name?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-slate-900">
                              {request.user_profile?.first_name} {request.user_profile?.last_name}
                            </div>
                            <div className="text-sm text-slate-500">{request.user_profile?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.bg} ${statusInfo.color}`}>
                          <StatusIcon className="h-3.5 w-3.5 mr-1.5" />
                          {formatStatus(request.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {new Date(request.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2 flex-wrap">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1 rounded-lg transition-all flex items-center gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            Review
                          </motion.button>
                          {request.status === 'pending' && (
                            <>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirmVerification(request.id, 'approved', request);
                                }}
                                disabled={processing === request.id}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50 px-3 py-1 rounded-lg transition-all flex items-center gap-1 disabled:opacity-50"
                              >
                                <Check className="h-4 w-4" />
                                Approve
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirmVerification(request.id, 'declined', request);
                                }}
                                disabled={processing === request.id}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded-lg transition-all flex items-center gap-1 disabled:opacity-50"
                              >
                                <X className="h-4 w-4" />
                                Decline
                              </motion.button>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Review Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-red-600 px-8 py-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Review ID Verification</h2>
                <p className="text-blue-100 text-sm mt-1">
                  {selectedRequest.user_profile?.first_name} {selectedRequest.user_profile?.last_name}
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowModal(false)}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              >
                <X className="w-6 h-6" />
              </motion.button>
            </div>

            {/* Modal Content */}
            <div className="p-8 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: User Information */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <div className="w-1 h-6 bg-gradient-to-b from-blue-600 to-red-600 rounded"></div>
                      User Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                        <span className="text-sm font-medium text-slate-600">First Name</span>
                        <span className="text-sm font-semibold text-slate-900">{selectedRequest.user_profile?.first_name || '—'}</span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                        <span className="text-sm font-medium text-slate-600">Last Name</span>
                        <span className="text-sm font-semibold text-slate-900">{selectedRequest.user_profile?.last_name || '—'}</span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                        <span className="text-sm font-medium text-slate-600">Email</span>
                        <span className="text-sm font-semibold text-slate-900">{selectedRequest.user_profile?.email}</span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                        <span className="text-sm font-medium text-slate-600">Username</span>
                        <span className="text-sm font-semibold text-slate-900">@{selectedRequest.user_profile?.username || '—'}</span>
                      </div>
                      {selectedRequest.user_profile?.phone && (
                        <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                          <span className="text-sm font-medium text-slate-600">Phone</span>
                          <span className="text-sm font-semibold text-slate-900">{selectedRequest.user_profile.phone}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                        <span className="text-sm font-medium text-slate-600">Submitted</span>
                        <span className="text-sm font-semibold text-slate-900">
                          {new Date(selectedRequest.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-3">
                        <span className="text-sm font-medium text-slate-600">User ID</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-500 truncate max-w-[150px]">{selectedRequest.user_id}</span>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            onClick={() => copyToClipboard(selectedRequest.user_id)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:bg-blue-50 px-2 py-1 rounded transition-all"
                          >
                            Copy
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* No ID Images Warning */}
                  {!selectedRequest.id_front_image_url && !selectedRequest.id_back_image_url && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-4"
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="text-sm font-semibold text-amber-900">No ID Images Uploaded</h4>
                          <p className="text-sm text-amber-800 mt-1">
                            This user has not uploaded ID images yet.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Right: ID Images */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <div className="w-1 h-6 bg-gradient-to-b from-blue-600 to-red-600 rounded"></div>
                      ID Documents
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Front of ID</h4>
                      {selectedRequest.id_front_image_url ? (
                        <>
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

                          <div className="mt-2 flex items-center justify-between">
                            <div className="text-xs text-gray-500 truncate max-w-[70%]">{selectedRequest.id_front_image_url}</div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openUrlInNewTab(getImageUrl(selectedRequest.id_front_image_url))}
                                className="text-sm text-blue-600 hover:underline"
                              >
                                Open
                              </button>
                              <button
                                onClick={() => copyToClipboard(getImageUrl(selectedRequest.id_front_image_url))}
                                className="text-sm text-gray-600 hover:underline"
                              >
                                Copy
                              </button>
                            </div>
                          </div>
                        </>
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
                        <>
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

                          <div className="mt-2 flex items-center justify-between">
                            <div className="text-xs text-gray-500 truncate max-w-[70%]">{selectedRequest.id_back_image_url}</div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openUrlInNewTab(getImageUrl(selectedRequest.id_back_image_url))}
                                className="text-sm text-blue-600 hover:underline"
                              >
                                Open
                              </button>
                              <button
                                onClick={() => copyToClipboard(getImageUrl(selectedRequest.id_back_image_url))}
                                className="text-sm text-gray-600 hover:underline"
                              >
                                Copy
                              </button>
                            </div>
                          </div>
                        </>
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
            </div>

            <div className="p-8 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowModal(false)}
                className="px-6 py-3 text-slate-700 bg-white border-2 border-slate-200 rounded-xl hover:border-slate-300 font-semibold transition-all"
              >
                Cancel
              </motion.button>
              {selectedRequest.status === 'pending' && (
                <>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => confirmVerification(selectedRequest.id, 'declined', selectedRequest)}
                    disabled={processing === selectedRequest.id}
                    className="px-6 py-3 text-white bg-red-500 hover:bg-red-600 rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 transition-all"
                  >
                    Decline
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => confirmVerification(selectedRequest.id, 'approved', selectedRequest)}
                    disabled={processing === selectedRequest.id}
                    className="px-6 py-3 text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 transition-all"
                  >
                    Approve
                  </motion.button>
                </>
              )}
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
