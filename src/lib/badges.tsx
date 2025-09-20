import React from 'react';
import { AlertCircle, CheckCircle, Clock, ClipboardList, Shield, XCircle } from 'lucide-react';

export type ReportStatus = 'verifying' | 'pending' | 'in_progress' | 'awaiting_verification' | 'resolved' | 'rejected' | 'cancelled' | string;
export type ReportPriority = 'high' | 'medium' | 'low' | string;

export const getStatusColor = (status: ReportStatus): string => {
  switch (status) {
    case 'verifying':
      return 'bg-purple-100 text-purple-800';
    case 'awaiting_verification':
      return 'bg-orange-100 text-orange-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'in_progress':
      return 'bg-blue-100 text-blue-800';
    case 'resolved':
      return 'bg-green-100 text-green-800';
    case 'rejected':
      return 'bg-red-100 text-red-800';
    case 'cancelled':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getStatusIcon = (status: ReportStatus): React.ReactNode => {
  switch (status) {
    case 'verifying':
      return <Shield className="w-4 h-4 text-purple-500" />;
    case 'awaiting_verification':
      return <ClipboardList className="w-4 h-4 text-orange-500" />;
    case 'pending':
      return <Clock className="w-4 h-4 text-yellow-500" />;
    case 'in_progress':
      return <AlertCircle className="w-4 h-4 text-blue-500" />;
    case 'resolved':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'rejected':
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'cancelled':
      return <XCircle className="w-4 h-4 text-gray-500" />;
    default:
      return <Clock className="w-4 h-4 text-gray-500" />;
  }
};

export const getPriorityColor = (priority: ReportPriority): string => {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'low':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};


