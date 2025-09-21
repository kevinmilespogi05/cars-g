import { useState, useEffect, useCallback } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  isChecking: boolean;
  lastChecked: Date | null;
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
}

// Simple flag to disable network checking (useful for testing)
const DISABLE_NETWORK_CHECK = false; // Set to true to disable network checking

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

  // Check if we're in development mode
  const isDevelopment = process.env.NODE_ENV === 'development' || 
                       window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';

  // Check connection using multiple methods
  const checkConnection = useCallback(async (): Promise<boolean> => {
    // If network checking is disabled, always return true
    if (DISABLE_NETWORK_CHECK) {
      console.log('Network checking disabled - always returning online');
      setStatus({
        isOnline: true,
        isChecking: false,
        lastChecked: new Date(),
        connectionType: 'wifi',
        effectiveType: '4g'
      });
      return true;
    }

    setStatus(prev => ({ ...prev, isChecking: true }));

    try {
      // Method 1: Check navigator.onLine (primary indicator)
      const browserOnline = navigator.onLine;
      
      // In development mode, be very lenient
      if (isDevelopment) {
        console.log('Development mode detected - using lenient network detection');
        setStatus({
          isOnline: true, // Assume online in development
          isChecking: false,
          lastChecked: new Date(),
          connectionType: 'wifi',
          effectiveType: '4g'
        });
        return true;
      }

      // Method 2: Try to fetch a small resource (only if browser thinks we're offline)
      let fetchSuccess = true; // Default to true to avoid false negatives
      if (!browserOnline) {
        try {
          const response = await fetch('/manifest.webmanifest', {
            method: 'HEAD',
            cache: 'no-cache',
            signal: AbortSignal.timeout(2000) // Reduced timeout to 2 seconds
          });
          fetchSuccess = response.ok;
        } catch (error) {
          console.log('Fetch test failed:', error);
          fetchSuccess = false;
        }
      }

      // Method 3: Check external services (only if previous checks failed)
      let externalSuccess = true; // Default to true to avoid false negatives
      if (!browserOnline && !fetchSuccess) {
        try {
          const response = await fetch('https://httpbin.org/status/200', {
            method: 'HEAD',
            signal: AbortSignal.timeout(1500) // Reduced timeout to 1.5 seconds
          });
          externalSuccess = response.ok;
        } catch (error) {
          console.log('External service test failed:', error);
          externalSuccess = false;
        }
      }

      // Determine online status - be very lenient
      // If browser thinks we're online, trust it
      // If browser thinks we're offline, require at least one successful test
      const isOnline = browserOnline || fetchSuccess || externalSuccess;
      
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
      // Don't assume offline on error, trust navigator.onLine
      return navigator.onLine;
    }
  }, [isDevelopment]);

  // Force online status (useful for debugging)
  const forceOnline = useCallback(() => {
    setStatus(prev => ({ ...prev, isOnline: true }));
    window.dispatchEvent(new Event('online'));
  }, []);

  useEffect(() => {
    // If network checking is disabled, don't set up any listeners
    if (DISABLE_NETWORK_CHECK) {
      console.log('Network checking disabled - not setting up listeners');
      return;
    }

    const handleOnline = () => {
      setStatus(prev => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setStatus(prev => ({ ...prev, isOnline: false }));
    };

    // Listen for browser online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial connection check with delay to avoid immediate false detection
    const initialCheck = setTimeout(() => {
      checkConnection();
    }, 2000); // Increased delay to 2 seconds

    // Set up periodic connection checking (less frequent to reduce false positives)
    const interval = setInterval(checkConnection, 120000); // Check every 2 minutes instead of 1 minute

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearTimeout(initialCheck);
      clearInterval(interval);
    };
  }, [checkConnection]);

  return {
    ...status,
    checkConnection,
    forceOnline
  };
}
