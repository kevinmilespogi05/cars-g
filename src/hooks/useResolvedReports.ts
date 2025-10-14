import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface ResolvedReportsData {
  count: number;
  loading: boolean;
  error: string | null;
}

const POLLING_INTERVAL = 10000; // 10 seconds

/**
 * Custom hook to fetch and poll resolved reports count from Supabase
 * Polls every 10 seconds to provide real-time resolved reports count
 */
export function useResolvedReports(): ResolvedReportsData {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResolvedReports = useCallback(async () => {
    try {
      // Fetch resolved reports count from reports table
      const { count: reportCount, error: fetchError } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'resolved');

      if (fetchError) {
        throw fetchError;
      }

      setCount(reportCount || 0);
      setError(null);
    } catch (err) {
      console.error('Error fetching resolved reports:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch resolved reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchResolvedReports();

    // Set up polling interval
    const intervalId = setInterval(() => {
      fetchResolvedReports();
    }, POLLING_INTERVAL);

    // Cleanup interval on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [fetchResolvedReports]);

  return { count, loading, error };
}

