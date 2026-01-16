import React from 'react';
import { AlertTriangle, AlertCircle, AlertOctagon } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          bg: 'bg-danger bg-opacity-10',
          text: 'text-danger',
          icon: AlertOctagon,
          button: 'btn-danger'
        };
      case 'warning':
        return {
          bg: 'bg-warning bg-opacity-10',
          text: 'text-warning-dark',
          icon: AlertTriangle,
          button: 'btn-warning'
        };
      case 'info':
        return {
          bg: 'bg-info bg-opacity-10',
          text: 'text-info',
          icon: AlertCircle,
          button: 'btn-primary'
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          icon: AlertCircle,
          button: 'btn-primary'
        };
    }
  };

  const styles = getTypeStyles();
  const Icon = styles.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in safe-top safe-bottom">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] shadow-xl transform transition-all animate-slide-up flex flex-col overflow-hidden">
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className={`flex-shrink-0 rounded-full p-2 ${styles.bg}`}>
              <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${styles.text}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 break-words">{title}</h3>
              <p className="text-sm sm:text-base text-gray-600 break-words">{message}</p>
            </div>
          </div>
          
          <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 sm:space-x-0">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline w-full sm:w-auto min-h-[44px] order-2 sm:order-1"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`btn ${styles.button} w-full sm:w-auto min-h-[44px] order-1 sm:order-2`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 