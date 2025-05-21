import { useRef, useCallback } from 'react';

interface RateLimiterOptions {
  maxRequests: number;
  timeWindow: number; // in milliseconds
}

export function useRateLimiter({ maxRequests = 50, timeWindow = 1000 }: RateLimiterOptions) {
  const requestTimestamps = useRef<number[]>([]);

  const isRateLimited = useCallback(() => {
    const now = Date.now();
    // Remove timestamps outside the time window
    requestTimestamps.current = requestTimestamps.current.filter(
      timestamp => now - timestamp < timeWindow
    );
    
    return requestTimestamps.current.length >= maxRequests;
  }, [maxRequests, timeWindow]);

  const trackRequest = useCallback(() => {
    const now = Date.now();
    requestTimestamps.current.push(now);
  }, []);

  const executeWithRateLimit = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    if (isRateLimited()) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    trackRequest();
    return fn();
  }, [isRateLimited, trackRequest]);

  return {
    isRateLimited,
    executeWithRateLimit,
  };
} 