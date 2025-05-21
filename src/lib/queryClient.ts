import { QueryClient } from '@tanstack/react-query';

const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const CACHE_TIME = 30 * 60 * 1000; // 30 minutes

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME,
      gcTime: CACHE_TIME,
      retry: (failureCount, error: any) => {
        // Don't retry on 404s or other client errors
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        // Retry up to 3 times on other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
}); 