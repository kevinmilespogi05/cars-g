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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-xl max-w-md w-full shadow-xl transform transition-all animate-slide-up">
        <div className="p-6">
          <div className="flex items-start space-x-4">
            <div className={`flex-shrink-0 rounded-full p-2 ${styles.bg}`}>
              <Icon className={`h-6 w-6 ${styles.text}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-600">{message}</p>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`btn ${styles.button}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 