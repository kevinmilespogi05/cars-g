import React from 'react';
import { CheckCircle, Clock, AlertCircle, XCircle, Shield, User, MapPin } from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatStatusForDisplay } from '../../lib/badges';

export interface TimelineEvent {
  id: string;
  status: string;
  timestamp: string;
  actor?: {
    name: string;
    role?: string;
    avatar_url?: string;
  };
  note?: string;
}

export interface StatusTimelineProps {
  events: TimelineEvent[];
  currentStatus: string;
  className?: string;
}

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4" />,
  in_progress: <AlertCircle className="h-4 w-4" />,
  resolved: <CheckCircle className="h-4 w-4" />,
  declined: <XCircle className="h-4 w-4" />,
  verifying: <Shield className="h-4 w-4" />,
  awaiting_verification: <Clock className="h-4 w-4" />,
};

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700 border-gray-200',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
  resolved: 'bg-green-100 text-green-700 border-green-200',
  declined: 'bg-red-100 text-red-700 border-red-200',
  verifying: 'bg-purple-100 text-purple-700 border-purple-200',
  awaiting_verification: 'bg-amber-100 text-amber-700 border-amber-200',
};

export function StatusTimeline({ events, currentStatus, className }: StatusTimelineProps) {
  if (events.length === 0) {
    return (
      <div className={cn('text-sm text-gray-500 text-center py-4', className)}>
        No status history available
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Timeline</h3>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
        
        <div className="space-y-6">
          {events.map((event, index) => {
            const isLatest = index === 0;
            const isCurrentStatus = event.status === currentStatus;
            
            return (
              <div key={event.id} className="relative flex items-start gap-4">
                {/* Timeline dot */}
                <div className={cn(
                  'relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all',
                  isCurrentStatus
                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-110'
                    : isLatest
                    ? 'bg-white border-blue-500 text-blue-600'
                    : 'bg-white border-gray-300 text-gray-400'
                )}>
                  {statusIcons[event.status] || <Clock className="h-4 w-4" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pb-6">
                  <div className="flex items-start justify-between gap-4 mb-1">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border',
                          statusColors[event.status] || statusColors.pending
                        )}>
                          {formatStatusForDisplay(event.status)}
                        </span>
                        {isCurrentStatus && (
                          <span className="text-xs text-blue-600 font-medium">Current</span>
                        )}
                      </div>
                      {event.note && (
                        <p className="text-sm text-gray-700 mt-1">{event.note}</p>
                      )}
                    </div>
                    <time 
                      className="text-xs text-gray-500 whitespace-nowrap"
                      dateTime={event.timestamp}
                    >
                      {new Date(event.timestamp).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </time>
                  </div>
                  
                  {event.actor && (
                    <div className="flex items-center gap-2 mt-2">
                      {event.actor.avatar_url ? (
                        <img
                          src={event.actor.avatar_url}
                          alt={event.actor.name}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="h-3 w-3 text-gray-500" />
                        </div>
                      )}
                      <span className="text-xs text-gray-600">
                        {event.actor.name}
                        {event.actor.role && (
                          <span className="text-gray-400 ml-1">• {event.actor.role}</span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

