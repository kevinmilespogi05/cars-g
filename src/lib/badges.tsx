import React from 'react';
import { AlertCircle, CheckCircle, Clock, ClipboardList, Shield, XCircle } from 'lucide-react';

export type ReportStatus = 'verifying' | 'pending' | 'in_progress' | 'awaiting_verification' | 'resolved' | 'rejected' | 'cancelled' | string;
export type ReportPriority = 'high' | 'medium' | 'low' | string;

export const getStatusColor = (status: ReportStatus): string => {
  switch (status) {
    case 'verifying':
      return 'bg-secondary-100 text-primary-700 border border-secondary-200';
    case 'awaiting_verification':
      return 'bg-warning-50 text-warning-800 border border-warning-200';
    case 'pending':
      return 'bg-gray-100 text-gray-700 border border-gray-200';
    case 'in_progress':
      return 'bg-warning-50 text-warning-800 border border-warning-200';
    case 'resolved':
      return 'bg-teal-50 text-teal-700 border border-teal-200';
    case 'rejected':
      return 'bg-red-50 text-red-700 border border-red-200';
    case 'cancelled':
      return 'bg-gray-100 text-gray-600 border border-gray-200';
    default:
      return 'bg-gray-100 text-gray-600 border border-gray-200';
  }
};

export const getStatusIcon = (status: ReportStatus): React.ReactNode => {
  switch (status) {
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
    case 'rejected':
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
      return 'bg-red-50 text-red-700 border border-red-200';
    case 'medium':
      return 'bg-warning-50 text-warning-800 border border-warning-200';
    case 'low':
      return 'bg-info-50 text-info-700 border border-info-200';
    default:
      return 'bg-gray-100 text-gray-600 border border-gray-200';
  }
};


