import React from 'react';
import { AlertCircle, CheckCircle, Clock, ClipboardList, Shield, XCircle } from 'lucide-react';

export type ReportStatus = 'verifying' | 'pending' | 'in_progress' | 'awaiting_verification' | 'resolved' | 'declined' | 'cancelled' | string;
export type ReportPriority = 'high' | 'medium' | 'low' | string;

export const getStatusColor = (status: ReportStatus): string => {
  const normalizedStatus = typeof status === 'string' ? status.toLowerCase() : '';
  
  switch (normalizedStatus) {
    case 'verifying':
      return 'bg-blue-50 text-blue-700 border border-blue-200';
    case 'awaiting_verification':
      return 'bg-amber-50 text-amber-800 border border-amber-200';
    case 'pending':
      return 'bg-gray-100 text-gray-700 border border-gray-200';
    case 'in_progress':
      return 'bg-blue-50 text-blue-800 border border-blue-200';
    case 'resolved':
      return 'bg-green-50 text-green-700 border border-green-200';
    case 'declined':
    case 'rejected': // Backward compatibility
      return 'bg-red-50 text-red-700 border border-red-200';
    case 'cancelled':
      return 'bg-gray-100 text-gray-600 border border-gray-200';
    default:
      return 'bg-gray-100 text-gray-600 border border-gray-200';
  }
};

export const getStatusIcon = (status: ReportStatus): React.ReactNode => {
  const normalizedStatus = typeof status === 'string' ? status.toLowerCase() : '';
  
  switch (normalizedStatus) {
    case 'verifying':
      return <Shield className="w-4 h-4 text-primary-600" />;
    case 'awaiting_verification':
      return <ClipboardList className="w-4 h-4 text-warning-700" />;
    case 'pending':
      return <Clock className="w-4 h-4 text-gray-600" />;
    case 'in_progress':
      return <AlertCircle className="w-4 h-4 text-warning-700" />;
    case 'resolved':
      return <CheckCircle className="w-4 h-4 text-teal-600" />;
    case 'declined':
    case 'rejected': // Backward compatibility
      return <XCircle className="w-4 h-4 text-red-600" />;
    case 'cancelled':
      return <XCircle className="w-4 h-4 text-gray-500" />;
    default:
      return <Clock className="w-4 h-4 text-gray-500" />;
  }
};

export const getPriorityColor = (priority: ReportPriority): string => {
  switch (priority) {
    case 'high':
      return 'bg-red-50 text-red-800 border border-red-200';
    case 'medium':
      return 'bg-amber-50 text-amber-800 border border-amber-200';
    case 'low':
      return 'bg-green-50 text-green-800 border border-green-200';
    default:
      return 'bg-gray-100 text-gray-600 border border-gray-200';
  }
};

/**
 * Format status for display with proper capitalization
 * Converts "declined" -> "Declined", handles underscores, etc.
 */
export const formatStatusForDisplay = (status: ReportStatus): string => {
  if (!status) return '';
  
  // Handle special cases - also handle "rejected" for backward compatibility
  switch (status.toLowerCase()) {
    case 'declined':
    case 'rejected': // Backward compatibility
      return 'Declined';
    case 'awaiting_verification':
      return 'Awaiting Verification';
    case 'in_progress':
      return 'In Progress';
    case 'verifying':
      return 'Verifying';
    case 'pending':
      return 'Pending';
    case 'resolved':
      return 'Resolved';
    case 'cancelled':
      return 'Cancelled';
    default:
      // Replace underscores and capitalize first letter of each word
      return status
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
  }
};

/**
 * Normalize status for database queries - handles both "rejected" and "declined"
 */
export const normalizeStatusForQuery = (status: string): string => {
  if (!status) return '';
  const normalized = status.toLowerCase().trim();
  // Convert "rejected" to "declined" for consistency
  if (normalized === 'rejected') return 'declined';
  return normalized.replace(/\s+/g, '_');
};

/**
 * Check if status is declined (handles both "rejected" and "declined")
 */
export const isDeclinedStatus = (status: string): boolean => {
  if (!status) return false;
  const normalized = status.toLowerCase().trim();
  return normalized === 'declined' || normalized === 'rejected';
};


