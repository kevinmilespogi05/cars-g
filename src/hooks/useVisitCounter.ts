import { useState, useEffect } from 'react';
import { trackVisitor, getVisitorCount } from '../services/visitCounterService';

interface UseVisitCounterOptions {
  autoTrack?: boolean;
  trackOnMount?: boolean;
}

interface UseVisitCounterReturn {
  count: number;
  loading: boolean;
  error: string | null;
  isNewVisitor: boolean | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to track and display unique visitor count
 * 
 * @param options - Configuration options
 * @param options.autoTrack - Automatically track the current visitor (default: true)
 * @param options.trackOnMount - Track visitor when component mounts (default: true)
 * @returns Object with count, loading state, error, and refresh function
 */
export function useVisitCounter(
  options: UseVisitCounterOptions = {}
): UseVisitCounterReturn {
  const { autoTrack = true, trackOnMount = true } = options;
  
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isNewVisitor, setIsNewVisitor] = useState<boolean | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const visitorCount = await getVisitorCount();
      setCount(visitorCount);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch visitor count';
      setError(errorMessage);
      console.error('Error refreshing visitor count:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        setLoading(true);
        setError(null);

        // First, get the current count
        const visitorCount = await getVisitorCount();
        if (mounted) {
          setCount(visitorCount);
        }

        // Then track the current visitor if enabled
        if (autoTrack && trackOnMount) {
          try {
            const result = await trackVisitor();
            if (mounted) {
              setCount(result.totalUniqueVisitors);
              setIsNewVisitor(result.isNewVisitor);
            }
          } catch (trackError) {
            // If tracking fails, we still have the count from above
            console.error('Error tracking visitor:', trackError);
          }
        }
      } catch (err) {
        if (mounted) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to initialize visitor counter';
          setError(errorMessage);
          console.error('Error initializing visitor counter:', err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [autoTrack, trackOnMount]);

  return {
    count,
    loading,
    error,
    isNewVisitor,
    refresh,
  };
}

