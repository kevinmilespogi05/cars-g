import React from 'react';
import { CheckCircle, Circle } from 'lucide-react';

interface VerifiedBadgeProps {
  isVerified: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * VerifiedBadge component displays a visual indicator for user verification status
 * @param isVerified - Boolean indicating if user is verified
 * @param size - Size of the badge ('sm', 'md', 'lg')
 * @param className - Additional CSS classes
 */
export function VerifiedBadge({ isVerified, size = 'sm', className = '' }: VerifiedBadgeProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const iconSize = sizeClasses[size];

  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      title={isVerified ? 'Verified user' : 'Not verified'}
      role="img"
      aria-label={isVerified ? 'Verified user' : 'Not verified'}
    >
      {isVerified ? (
        <CheckCircle 
          className={`${iconSize} flex-shrink-0`}
          style={{ color: '#10b981' }}
          aria-hidden="true"
        />
      ) : (
        <Circle 
          className={`${iconSize} flex-shrink-0`}
          style={{ color: '#9ca3af' }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

/**
 * Helper function to determine if a user is verified based on verification_status
 * @param verificationStatus - The verification status string from user object
 * @returns Boolean indicating if user is verified
 */
export function isUserVerified(verificationStatus: string | null | undefined): boolean {
  if (!verificationStatus) return false;
  
  const status = String(verificationStatus).toLowerCase();
  return status === 'verified' || status === 'active' || status === 'ai_verified' || status === 'approved';
}

