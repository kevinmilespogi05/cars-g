import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';

interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
  nonInteraction?: boolean;
}

export const useAnalytics = () => {
  const location = useLocation();

  const trackPageView = useCallback(() => {
    if (typeof window !== 'undefined' && 'gtag' in window) {
      const gtag = (window as any).gtag;
      gtag('config', process.env.VITE_GA_MEASUREMENT_ID, {
        page_path: location.pathname + location.search
      });
    }
  }, [location]);

  const trackEvent = useCallback(({ category, action, label, value, nonInteraction = false }: AnalyticsEvent) => {
    if (typeof window !== 'undefined' && 'gtag' in window) {
      const gtag = (window as any).gtag;
      gtag('event', action, {
        event_category: category,
        event_label: label,
        value: value,
        non_interaction: nonInteraction
      });
    }
  }, []);

  const trackError = useCallback((error: Error, errorInfo?: any) => {
    if (typeof window !== 'undefined' && 'gtag' in window) {
      const gtag = (window as any).gtag;
      gtag('event', 'error', {
        event_category: 'Error',
        event_label: error.message,
        error_stack: error.stack,
        error_info: JSON.stringify(errorInfo)
      });
    }
  }, []);

  const trackTiming = useCallback((category: string, variable: string, value: number, label?: string) => {
    if (typeof window !== 'undefined' && 'gtag' in window) {
      const gtag = (window as any).gtag;
      gtag('event', 'timing_complete', {
        event_category: category,
        name: variable,
        value: value,
        event_label: label
      });
    }
  }, []);

  return {
    trackPageView,
    trackEvent,
    trackError,
    trackTiming
  };
}; 