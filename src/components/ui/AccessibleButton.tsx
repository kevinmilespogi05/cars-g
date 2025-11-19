import React from 'react';
import { Button, ButtonProps } from './Button';
import { cn } from '../../lib/utils';

export interface AccessibleButtonProps extends ButtonProps {
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-pressed'?: boolean;
  'aria-expanded'?: boolean;
  'aria-controls'?: string;
}

/**
 * Accessible Button component that ensures proper ARIA attributes
 * and keyboard navigation support
 */
export function AccessibleButton({
  children,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  className,
  ...props
}: AccessibleButtonProps) {
  // If button only has icon or no visible text, ensure aria-label is provided
  const hasAccessibleLabel = ariaLabel || (typeof children === 'string' && children.trim().length > 0);
  
  if (!hasAccessibleLabel && process.env.NODE_ENV === 'development') {
    console.warn('AccessibleButton: Button should have aria-label when it only contains icons or no visible text');
  }

  return (
    <Button
      {...props}
      className={cn('focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2', className)}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
    >
      {children}
    </Button>
  );
}

