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

  // Cleanup function
  const cleanup = useCallback(() => {
    subscriptionsRef.current.forEach(unsubscribe => unsubscribe());
    subscriptionsRef.current = [];
  }, []);

  useEffect(() => {
    if (!enabled) {
      cleanup();
      return;
    }

    // Subscribe to new reports
    if (onReportCreated) {
      const subscription = reportsService.subscribeToReports(onReportCreated);
      subscriptionsRef.current.push(subscription);
    }

    // Subscribe to report updates
    if (onReportUpdated) {
      const subscription = reportsService.subscribeToReports((report) => {
        // This will trigger for both new and updated reports
        // You can differentiate by checking if the report already exists in your state
        onReportUpdated(report.id, report);
      });
      subscriptionsRef.current.push(subscription);
    }

    // Subscribe to status changes
    if (onReportStatusChanged) {
      const subscription = reportsService.subscribeToReportStatusChanges(onReportStatusChanged);
      subscriptionsRef.current.push(subscription);
    }

    // Subscribe to likes changes
    if (onLikesChanged) {
      const subscription = reportsService.subscribeToLikesChanges(onLikesChanged);
      subscriptionsRef.current.push(subscription);
    }

    // Cleanup on unmount or when dependencies change
    return cleanup;
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