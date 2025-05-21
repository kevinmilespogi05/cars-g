import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { useRateLimiter } from './useRateLimiter';
import { backgroundSync } from '../lib/backgroundSync';
import { usePrefetch } from './usePrefetch';

export function useApi() {
  const { executeWithRateLimit } = useRateLimiter({
    maxRequests: 50,
    timeWindow: 1000,
  });
  const { prefetchData, warmCache } = usePrefetch();

  function useApiQuery<TData = unknown, TError = Error>(
    key: string[],
    url: string,
    options?: Omit<UseQueryOptions<TData, TError, TData>, 'queryKey' | 'queryFn'>
  ) {
    return useQuery<TData, TError>({
      queryKey: key,
      queryFn: () => executeWithRateLimit(() => apiClient.get<TData>(url)),
      ...options,
    });
  }

  function useApiMutation<TData = unknown, TVariables = unknown, TError = Error>(
    url: string,
    method: 'POST' | 'PUT' | 'DELETE' = 'POST',
    options?: Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'>
  ) {
    return useMutation<TData, TError, TVariables>({
      mutationFn: async (variables) => {
        try {
          return await executeWithRateLimit(() => {
            switch (method) {
              case 'POST':
                return apiClient.post<TData>(url, variables);
              case 'PUT':
                return apiClient.put<TData>(url, variables);
              case 'DELETE':
                return apiClient.delete<TData>(url);
              default:
                throw new Error(`Unsupported method: ${method}`);
            }
          });
        } catch (error) {
          if (!navigator.onLine) {
            // Queue the operation for background sync
            await backgroundSync.queueOperation(
              options?.queryKey || [],
              method.toLowerCase() as 'create' | 'update' | 'delete',
              url,
              variables
            );
            return Promise.resolve() as Promise<TData>;
          }
          throw error;
        }
      },
      ...options,
    });
  }

  return {
    useApiQuery,
    useApiMutation,
    prefetchData,
    warmCache,
  };
} 