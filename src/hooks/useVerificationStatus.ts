import { useAuthStore } from '../store/authStore';

/**
 * Hook to check if the current user is verified (approved by admin)
 * Returns true if user is verified, false if pending or not authenticated
 */
export function useVerificationStatus() {
  const { user, isAuthenticated } = useAuthStore();

  return {
    isPending: isAuthenticated && user?.verification_status === 'pending',
    isApproved: isAuthenticated && user?.verification_status === 'approved',
    isDeclined: isAuthenticated && user?.verification_status === 'declined',
    isVerified: isAuthenticated && user?.verification_status === 'approved',
    verificationStatus: user?.verification_status || null,
    isAuthenticated,
  };
}
