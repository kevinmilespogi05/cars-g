import { useState, useEffect, useCallback } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  isChecking: boolean;
  lastChecked: Date | null;
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
}

export function useNetworkStatus(): NetworkStatus & {
  checkConnection: () => Promise<boolean>;
  forceOnline: () => void;
} {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    isChecking: false,
    lastChecked: null,
    connectionType: 'unknown',
    effectiveType: 'unknown'
  });

  // Check connection using multiple methods
  const checkConnection = useCallback(async (): Promise<boolean> => {
    setStatus(prev => ({ ...prev, isChecking: true }));

    try {
      // Method 1: Check navigator.onLine
      const browserOnline = navigator.onLine;
      
      // Method 2: Try to fetch a small resource
      let fetchSuccess = false;
      try {
        const response = await fetch('/manifest.webmanifest', {
          method: 'HEAD',
          cache: 'no-cache',
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        fetchSuccess = response.ok;
      } catch (error) {
        console.log('Fetch test failed:', error);
      }

      // Method 3: Check if we can reach external services
      let externalSuccess = false;
      try {
        const response = await fetch('https://httpbin.org/status/200', {
          method: 'HEAD',
          signal: AbortSignal.timeout(3000) // 3 second timeout
        });
        externalSuccess = response.ok;
      } catch (error) {
        console.log('External service test failed:', error);
      }

      // Determine online status based on multiple checks
      const isOnline = browserOnline && (fetchSuccess || externalSuccess);
      
      // Get connection information if available
      let connectionType: 'wifi' | 'cellular' | 'ethernet' | 'unknown' = 'unknown';
      let effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown' = 'unknown';

      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection) {
          connectionType = connection.type || 'unknown';
          effectiveType = connection.effectiveType || 'unknown';
        }
      }

      setStatus({
        isOnline,
        isChecking: false,
        lastChecked: new Date(),
        connectionType,
        effectiveType
      });

      // If browser thinks we're offline but we actually have connection, force update
      if (!navigator.onLine && isOnline) {
        window.dispatchEvent(new Event('online'));
      }

      return isOnline;
    } catch (error) {
      console.error('Error checking connection:', error);
      setStatus(prev => ({ ...prev, isChecking: false }));
      return false;
    }
  }, []);

  // Force online status (useful for debugging)
  const forceOnline = useCallback(() => {
    setStatus(prev => ({ ...prev, isOnline: true }));
    window.dispatchEvent(new Event('online'));
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setStatus(prev => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setStatus(prev => ({ ...prev, isOnline: false }));
    };

    // Listen for browser online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial connection check
    checkConnection();

    // Set up periodic connection checking
    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [checkConnection]);

  return {
    ...status,
    checkConnection,
    forceOnline
  };
}
