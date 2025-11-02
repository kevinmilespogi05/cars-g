import React, { useState, useEffect } from 'react';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  EyeIcon, 
  ClockIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

interface UserProfile {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

interface VerificationRequest {
  id: string;
  user_id: string;
  id_front_image_url: string;
  id_back_image_url: string;
  status: 'pending' | 'approved' | 'declined' | 'ai_processing';
  admin_notes?: string;
  created_at: string;
  processed_at?: string;
  user_profile: UserProfile;
}

interface AdminVerificationQueueProps {
  onClose: () => void;
}

const AdminVerificationQueue: React.FC<AdminVerificationQueueProps> = ({ onClose }) => {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');

  // Fetch verification requests
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/verification-requests');
      const data = await response.json();
      
      if (data.success) {
        setRequests(data.requests || []);
      } else {
        setError('Failed to fetch verification requests');
      }
    } catch (err) {
      setError('Error loading verification requests');
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Handle admin decision
  const handleAdminDecision = async (requestId: string, decision: 'approved' | 'declined') => {
    try {
      setProcessing(requestId);
      
      const response = await fetch('/api/admin/verify-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId,
          decision,
          notes: decision === 'declined' ? rejectNotes : undefined
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Update local state
        setRequests(prev => 
          prev.map(req => 
            req.id === requestId 
              ? { ...req, status: decision, processed_at: new Date().toISOString() }
              : req
          )
        );
        
        // Close modal if open
        setSelectedRequest(null);
        setRejectNotes('');
        
        // Show success message
        alert(`User verification ${decision} successfully!`);
      } else {
        alert(`Failed to ${decision} verification: ${data.error}`);
      }
    } catch (err) {
      console.error('Error processing decision:', err);
      alert('Error processing decision. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon, text: 'Pending' },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon, text: 'Approved' },
      declined: { color: 'bg-red-100 text-red-800', icon: XCircleIcon, text: 'Declined' },
      ai_processing: { color: 'bg-blue-100 text-blue-800', icon: ClockIcon, text: 'AI Processing' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading verification requests...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Verification Queue</h2>
              <p className="text-blue-100 mt-1">
                Review and approve user ID verification requests
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <XCircleIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <div className="flex">
                <XCircleIcon className="w-5 h-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {requests.length === 0 ? (
            <div className="text-center py-12">
              <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No verification requests</h3>
              <p className="text-gray-500">All verification requests have been processed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {request.user_profile.first_name} {request.user_profile.last_name}
                        </h3>
                        <p className="text-sm text-gray-600">@{request.user_profile.username}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {getStatusBadge(request.status)}
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <EyeIcon className="w-4 h-4 mr-2" />
                        Review
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <EnvelopeIcon className="w-4 h-4 mr-2" />
                      {request.user_profile.email}
                    </div>
                    {request.user_profile.phone && (
                      <div className="flex items-center text-sm text-gray-600">
                        <PhoneIcon className="w-4 h-4 mr-2" />
                        {request.user_profile.phone}
                      </div>
                    )}
                    <div className="flex items-center text-sm text-gray-600">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      Submitted: {formatDate(request.created_at)}
                    </div>
                  </div>

                  {request.status === 'pending' && (
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleAdminDecision(request.id, 'approved')}
                        disabled={processing === request.id}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                      >
                        <CheckCircleIcon className="w-4 h-4 mr-2" />
                        {processing === request.id ? 'Processing...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <XCircleIcon className="w-4 h-4 mr-2" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  Review ID Documents - {selectedRequest.user_profile.first_name} {selectedRequest.user_profile.last_name}
                </h3>
                <button
                  onClick={() => {
                    setSelectedRequest(null);
                    setRejectNotes('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* User Information */}
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-blue-900 mb-3">User Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-800">Name</label>
                    <p className="text-blue-900">{selectedRequest.user_profile.first_name} {selectedRequest.user_profile.last_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-800">Username</label>
                    <p className="text-blue-900">@{selectedRequest.user_profile.username}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-800">Email</label>
                    <p className="text-blue-900">{selectedRequest.user_profile.email}</p>
                  </div>
                  {selectedRequest.user_profile.phone && (
                    <div>
                      <label className="block text-sm font-medium text-blue-800">Phone</label>
                      <p className="text-blue-900">{selectedRequest.user_profile.phone}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ID Documents */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Front of ID</h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <img
                      src={selectedRequest.id_front_image_url}
                      alt="Front of ID"
                      className="w-full h-auto max-h-96 object-contain bg-gray-50"
                      onError={(e) => {
                        e.currentTarget.src = '/images/placeholder-id.png';
                      }}
                    />
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Back of ID</h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <img
                      src={selectedRequest.id_back_image_url}
                      alt="Back of ID"
                      className="w-full h-auto max-h-96 object-contain bg-gray-50"
                      onError={(e) => {
                        e.currentTarget.src = '/images/placeholder-id.png';
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Rejection Notes */}
              {selectedRequest.status === 'pending' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rejection Notes (if rejecting)
                  </label>
                  <textarea
                    value={rejectNotes}
                    onChange={(e) => setRejectNotes(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter reason for rejection (optional)"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setSelectedRequest(null);
                    setRejectNotes('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                {selectedRequest.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleAdminDecision(selectedRequest.id, 'approved')}
                      disabled={processing === selectedRequest.id}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircleIcon className="w-4 h-4 inline mr-2" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleAdminDecision(selectedRequest.id, 'declined')}
                      disabled={processing === selectedRequest.id}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                      <XCircleIcon className="w-4 h-4 inline mr-2" />
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVerificationQueue;
