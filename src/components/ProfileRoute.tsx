import React from 'react';
import { useParams } from 'react-router-dom';
import { useVerificationStatus } from '../hooks/useVerificationStatus';
import { useAuthStore } from '../store/authStore';

export function ProfileRoute({ children }: { children: React.ReactNode }) {
  const { id } = useParams();
  const { isPending } = useVerificationStatus();
  const { user } = useAuthStore();

  // If pending user is trying to view someone else's profile, render the
  // child with a `softBlocked` prop so the Profile page can show a limited
  // view (soft-block) instead of performing a hard redirect.
  if (isPending && id && user?.id && id !== user.id) {
    // If children is a valid React element, clone it and inject the `softBlocked` prop.
    if (React.isValidElement(children)) {
      return React.cloneElement(children, { softBlocked: true } as any);
    }
    // Otherwise, just render children (fallback)
    return <>{children}</>;
  }

  return <>{children}</>;
}

export default ProfileRoute;
