import React from 'react';
import { AlertCircle, CheckCircle, Clock, ClipboardList, Shield, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ReportStatus, ReportPriority } from '../../lib/badges';

export interface StatusBadgeProps {
  status: ReportStatus;
  priority?: ReportPriority;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  verifying: {
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: <Shield className="h-3.5 w-3.5" />,
    label: 'Verifying',
  },
  awaiting_verification: {
    color: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: <ClipboardList className="h-3.5 w-3.5" />,
    label: 'Awaiting Verification',
  },
  pending: {
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: <Clock className="h-3.5 w-3.5" />,
    label: 'Pending',
  },
  in_progress: {
    color: 'bg-blue-50 text-blue-800 border-blue-200',
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    label: 'In Progress',
  },
  resolved: {
    color: 'bg-green-50 text-green-700 border-green-200',
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    label: 'Resolved',
  },
  declined: {
    color: 'bg-red-50 text-red-700 border-red-200',
    icon: <XCircle className="h-3.5 w-3.5" />,
    label: 'Declined',
  },
  rejected: {
    color: 'bg-red-50 text-red-700 border-red-200',
    icon: <XCircle className="h-3.5 w-3.5" />,
    label: 'Declined',
  },
  cancelled: {
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    icon: <XCircle className="h-3.5 w-3.5" />,
    label: 'Cancelled',
  },
};

const priorityConfig: Record<string, { color: string; label: string }> = {
  high: {
    color: 'bg-red-50 text-red-800 border-red-200',
    label: 'High',
  },
  medium: {
    color: 'bg-amber-50 text-amber-800 border-amber-200',
    label: 'Medium',
  },
  low: {
    color: 'bg-green-50 text-green-800 border-green-200',
    label: 'Low',
  },
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

export function StatusBadge({
  status,
  priority,
  size = 'md',
  showIcon = true,
  className,
}: StatusBadgeProps) {
  const normalizedStatus = typeof status === 'string' ? status.toLowerCase() : '';
  const config = statusConfig[normalizedStatus] || {
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    icon: <Clock className="h-3.5 w-3.5" />,
    label: normalizedStatus
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' '),
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border font-semibold',
          config.color,
          sizeStyles[size],
          className
        )}
      >
        {showIcon && <span className="flex-shrink-0">{config.icon}</span>}
        <span>{config.label}</span>
      </span>
      {priority && priorityConfig[priority] && (
        <span
          className={cn(
            'inline-flex items-center rounded-full border font-semibold',
            priorityConfig[priority].color,
            sizeStyles[size]
          )}
        >
          {priorityConfig[priority].label}
        </span>
      )}
    </div>
  );
}

