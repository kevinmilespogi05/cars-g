import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';

export function usePrefetch() {
  const queryClient = useQueryClient();

  const prefetchData = useCallback(async <T>(
    queryKey: string[],
    url: string,
    options?: {
      staleTime?: number;
      cacheTime?: number;
    }
  ) => {
    await queryClient.prefetchQuery({
      queryKey,
      queryFn: () => apiClient.get<T>(url),
      staleTime: options?.staleTime,
      gcTime: options?.cacheTime,
    });
  }, [queryClient]);

  const warmCache = useCallback(async <T>(
    queryKeys: Array<{ key: string[]; url: string }>,
    options?: {
      staleTime?: number;
      cacheTime?: number;
    }
  ) => {
    const promises = queryKeys.map(({ key, url }) =>
      prefetchData<T>(key, url, options)
    );
    await Promise.all(promises);
  }, [prefetchData]);

  return {
    prefetchData,
    warmCache,
  };
} 