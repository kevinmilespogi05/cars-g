import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { useState, useCallback } from 'react';

interface FetchOptions<T> {
  queryKey: string[];
  fetchFn: () => Promise<T>;
  staleTime?: number;
  cacheTime?: number;
  retry?: number | boolean;
  retryDelay?: number;
  onError?: (error: Error) => void;
  onSuccess?: (data: T) => void;
  enabled?: boolean;
}

interface MutationOptions<T, V> {
  mutationFn: (variables: V) => Promise<T>;
  onSuccess?: (data: T, variables: V) => void;
  onError?: (error: Error, variables: V) => void;
  onSettled?: (data: T | undefined, error: Error | null, variables: V) => void;
  optimisticUpdate?: (variables: V) => void;
  invalidateQueries?: string[];
}

export function useDataFetching<T>({
  queryKey,
  fetchFn,
  staleTime = 1000 * 60 * 5, // 5 minutes
  cacheTime = 1000 * 60 * 30, // 30 minutes
  retry = 3,
  retryDelay = 1000,
  onError,
  onSuccess,
  enabled = true,
}: FetchOptions<T>) {
  const [error, setError] = useState<Error | null>(null);
  const [isRefetching, setIsRefetching] = useState(false);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      try {
        const data = await fetchFn();
        setError(null);
        onSuccess?.(data);
        return data;
      } catch (err) {
        const error = err as Error;
        setError(error);
        onError?.(error);
        throw error;
      }
    },
    staleTime,
    cacheTime,
    retry: (failureCount, error) => {
      if (typeof retry === 'boolean') return retry;
      return failureCount < retry;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), retryDelay),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    enabled,
  });

  const refetch = useCallback(async () => {
    setIsRefetching(true);
    try {
      await query.refetch();
    } finally {
      setIsRefetching(false);
    }
  }, [query]);

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: error || query.error,
    refetch,
    isRefetching,
    isFetching: query.isFetching,
  };
}

export function useDataMutation<T, V>({
  mutationFn,
  onSuccess,
  onError,
  onSettled,
  optimisticUpdate,
  invalidateQueries,
}: MutationOptions<T, V>) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<Error | null>(null);
  const [isPending, setIsPending] = useState(false);

  const mutation = useMutation({
    mutationFn: async (variables: V) => {
      setIsPending(true);
      try {
        const data = await mutationFn(variables);
        setError(null);
        return data;
      } catch (err) {
        const error = err as Error;
        setError(error);
        throw error;
      } finally {
        setIsPending(false);
      }
    },
    onMutate: optimisticUpdate,
    onSuccess: (data, variables) => {
      if (invalidateQueries) {
        invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey: [queryKey] });
        });
      } else {
        queryClient.invalidateQueries();
      }
      onSuccess?.(data, variables);
    },
    onError: (err, variables) => {
      setError(err as Error);
      onError?.(err as Error, variables);
    },
    onSettled: (data, error, variables) => {
      onSettled?.(data, error as Error | null, variables);
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isLoading: mutation.isLoading || isPending,
    isError: mutation.isError,
    error: error || mutation.error,
    reset: mutation.reset,
  };
} 