import React from 'react';
import { cn } from '../../lib/utils';

export interface SkeletonLoaderProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card' | 'table-row';
  width?: string | number;
  height?: string | number;
  lines?: number;
  animated?: boolean;
}

export function SkeletonLoader({
  className,
  variant = 'rectangular',
  width,
  height,
  lines = 1,
  animated = true
}: SkeletonLoaderProps) {
  const baseClasses = cn(
    'bg-gray-200 rounded',
    animated && 'animate-pulse'
  );

  if (variant === 'text') {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              baseClasses,
              i === lines - 1 ? 'w-3/4' : 'w-full'
            )}
            style={{
              height: height || '1rem',
              width: i === lines - 1 && !width ? undefined : width
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'circular') {
    return (
      <div
        className={cn(baseClasses, 'rounded-full', className)}
        style={{
          width: width || height || '40px',
          height: height || width || '40px'
        }}
      />
    );
  }

  if (variant === 'card') {
    return (
      <div className={cn('bg-white rounded-lg border border-gray-200 p-4', className)}>
        <div className={cn(baseClasses, 'h-4 w-3/4 mb-3')} />
        <div className={cn(baseClasses, 'h-3 w-full mb-2')} />
        <div className={cn(baseClasses, 'h-3 w-5/6')} />
      </div>
    );
  }

  if (variant === 'table-row') {
    return (
      <tr className={cn('animate-pulse', className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <td key={i} className="px-4 py-3">
            <div className={cn(baseClasses, 'h-4 w-full')} />
          </td>
        ))}
      </tr>
    );
  }

  return (
    <div
      className={cn(baseClasses, className)}
      style={{
        width: width || '100%',
        height: height || '1rem'
      }}
    />
  );
}

// Pre-built skeleton components
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
      <SkeletonLoader variant="text" lines={2} className="mb-4" />
      <SkeletonLoader variant="rectangular" height="200px" className="mb-4" />
      <div className="flex items-center gap-2">
        <SkeletonLoader variant="circular" width="40px" height="40px" />
        <SkeletonLoader variant="text" lines={1} width="60%" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <SkeletonLoader variant="rectangular" height="16px" width="80%" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonLoader key={i} variant="table-row" />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

