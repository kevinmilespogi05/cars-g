import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

interface NotificationProps {
  message: string;
  type: 'success' | 'error' | 'warning';
  onClose: () => void;
  duration?: number;
}

export function Notification({ message, type, onClose, duration = 5000 }: NotificationProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-success bg-opacity-10',
          text: 'text-success',
          icon: CheckCircle,
          border: 'border-success'
        };
      case 'error':
        return {
          bg: 'bg-danger bg-opacity-10',
          text: 'text-danger',
          icon: XCircle,
          border: 'border-danger'
        };
      case 'warning':
        return {
          bg: 'bg-warning bg-opacity-10',
          text: 'text-warning-dark',
          icon: AlertCircle,
          border: 'border-warning'
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          icon: AlertCircle,
          border: 'border-gray-300'
        };
    }
  };

  const styles = getTypeStyles();
  const Icon = styles.icon;

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-down">
      <div 
        className={`
          rounded-lg shadow-lg border-l-4 ${styles.border}
          bg-white p-4 w-full max-w-md transform transition-all
          hover:scale-102 hover:shadow-xl
        `}
      >
        <div className="flex items-start space-x-3">
          <div className={`flex-shrink-0 ${styles.text}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${styles.text}`}>{message}</p>
          </div>
          <div className="flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className={`
                rounded-full p-1.5 inline-flex items-center justify-center
                text-gray-400 hover:text-gray-500 focus:outline-none
                focus:ring-2 focus:ring-offset-2 focus:ring-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'warning'}
              `}
            >
              <span className="sr-only">Close</span>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 