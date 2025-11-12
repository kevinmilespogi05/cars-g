import React from 'react';
import { Link, To } from 'react-router-dom';
import { useVerificationStatus } from '../hooks/useVerificationStatus';
import { useToastContext } from '../contexts/ToastContext';
import { useAuthStore } from '../store/authStore';

interface Props {
  to: To;
  className?: string;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}

export function ProfileLinkGuarded({ to, className, children, onClick }: Props) {
  const { isPending } = useVerificationStatus();
  const { error: showToastError } = useToastContext();
  const { user } = useAuthStore();

  const handleClick = (e: React.MouseEvent) => {
    // allow clicks that provide their own behavior
    if (onClick) onClick(e);

    // If already prevented, do nothing
    if (e.defaultPrevented) return;

    // Only guard profile links of the form /profile/:id
    const toStr = typeof to === 'string' ? to : (to as any)?.pathname || '';
    const match = toStr.match(/\/profile\/(.+)$/);
    if (isPending && match) {
      const targetId = match[1];
      // allow pending user to view own profile
      if (user?.id && user.id === targetId) return;
      e.preventDefault();
      try { showToastError('Your account is pending verification. You cannot view other users\' profiles yet.', 5000); } catch {}
    }
  };

  return (
    <Link to={to} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}

export default ProfileLinkGuarded;
