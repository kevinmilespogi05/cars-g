import { useEffect, useRef, useCallback } from 'react';
import { reportsService } from '../services/reportsService';
import { Report } from '../types';

interface UseRealTimeReportsOptions {
  onReportCreated?: (report: Report) => void;
  onReportUpdated?: (reportId: string, updates: Partial<Report>) => void;
  onReportStatusChanged?: (reportId: string, newStatus: string) => void;
  onLikesChanged?: (reportId: string, likeCount: number) => void;
  enabled?: boolean;
}

export function useRealTimeReports(options: UseRealTimeReportsOptions = {}) {
  const {
    onReportCreated,
    onReportUpdated,
    onReportStatusChanged,
    onLikesChanged,
    enabled = true
  } = options;

  const subscriptionsRef = useRef<Array<() => void>>([]);
  const isSubscribedRef = useRef(false);
  const hiddenRef = useRef<boolean>(typeof document !== 'undefined' ? document.hidden : false);

  // Debounce helper to coalesce rapid events and reduce UI thrash under load
  const debounce = <T extends (...args: any[]) => void>(fn: T, delay = 50) => {
    let timer: any;
    return (...args: Parameters<T>) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };

  // Cleanup function
  const cleanup = useCallback(() => {
    subscriptionsRef.current.forEach(unsubscribe => unsubscribe());
    subscriptionsRef.current = [];
  }, []);

  useEffect(() => {
    const subscribeAll = () => {
      if (!enabled || isSubscribedRef.current || hiddenRef.current) return;

      // Subscribe to new reports
      if (onReportCreated) {
        const subscription = reportsService.subscribeToReports(debounce(onReportCreated, 50));
        subscriptionsRef.current.push(subscription);
      }

      // Subscribe to report updates
      if (onReportUpdated) {
        const subscription = reportsService.subscribeToReports(debounce((report) => {
          onReportUpdated(report.id, report);
        }, 50));
        subscriptionsRef.current.push(subscription);
      }

      // Subscribe to status changes
      if (onReportStatusChanged) {
        const subscription = reportsService.subscribeToReportStatusChanges(debounce(onReportStatusChanged, 50));
        subscriptionsRef.current.push(subscription);
      }

      // Subscribe to likes changes
      if (onLikesChanged) {
        const subscription = reportsService.subscribeToLikesChanges(debounce(onLikesChanged, 50));
        subscriptionsRef.current.push(subscription);
      }

      isSubscribedRef.current = true;
    };

    const unsubscribeAll = () => {
      if (!isSubscribedRef.current) return;
      cleanup();
      isSubscribedRef.current = false;
    };

    // Initial subscribe
    subscribeAll();

    // Visibility-based optimization: pause realtime when tab is hidden
    const handleVisibility = () => {
      hiddenRef.current = document.hidden;
      if (document.hidden) {
        unsubscribeAll();
      } else {
        subscribeAll();
      }
    };

    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
      unsubscribeAll();
    };
  }, [enabled, onReportCreated, onReportUpdated, onReportStatusChanged, onLikesChanged, cleanup]);

  // Return cleanup function for manual cleanup
  return { cleanup };
}

// Optimized hook for just status changes
export function useReportStatusUpdates(onStatusChange?: (reportId: string, newStatus: string) => void) {
  const subscriptionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!onStatusChange) return;

    subscriptionRef.current = reportsService.subscribeToReportStatusChanges(onStatusChange);

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
      }
    };
  }, [onStatusChange]);

  return subscriptionRef.current;
}

// Optimized hook for just likes updates
export function useLikesUpdates(onLikesChange?: (reportId: string, likeCount: number) => void) {
  const subscriptionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!onLikesChange) return;

    subscriptionRef.current = reportsService.subscribeToLikesChanges(onLikesChange);

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
      }
    };
  }, [onLikesChange]);

  return subscriptionRef.current;
} 