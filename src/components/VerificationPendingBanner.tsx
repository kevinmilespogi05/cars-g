import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export function VerificationPendingBanner() {
  const { user } = useAuthStore();
  const [isVisible, setIsVisible] = React.useState(true);

  // Only show if user is pending verification
  if (!user || user.verification_status !== 'pending' || !isVisible) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-amber-50 border-b-2 border-amber-200 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-start gap-4 sm:items-center sm:gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5 sm:mt-0" />
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-amber-900">
            Your account is pending verification
          </h3>
          <p className="text-xs sm:text-sm text-amber-800 mt-1">
            Your account is awaiting admin approval. You have limited access to features. Once approved, you'll have full access to all features.
          </p>
        </div>

        <button
          onClick={() => setIsVisible(false)}
          className="flex-shrink-0 text-amber-600 hover:text-amber-700 transition-colors p-1"
          aria-label="Dismiss notification"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
