import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface ActiveUsersData {
  count: number;
  loading: boolean;
  error: string | null;
}

const POLLING_INTERVAL = 10000; // 10 seconds

/**
 * Custom hook to fetch and poll active users count from Supabase
 * Polls every 10 seconds to provide real-time user count
 */
export function useActiveUsers(): ActiveUsersData {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveUsers = useCallback(async () => {
    try {
      // Fetch total users count from profiles table (excluding banned users)
      const { count: userCount, error: fetchError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_banned', false);

      if (fetchError) {
        throw fetchError;
      }

      setCount(userCount || 0);
      setError(null);
    } catch (err) {
      console.error('Error fetching active users:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch active users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchActiveUsers();

    // Set up polling interval
    const intervalId = setInterval(() => {
      fetchActiveUsers();
    }, POLLING_INTERVAL);

    // Cleanup interval on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [fetchActiveUsers]);

  return { count, loading, error };
}

