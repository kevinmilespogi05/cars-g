import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '../store/authStore';

interface RealTimeConfig {
  enableReports?: boolean;
  enableChat?: boolean;
  enableNotifications?: boolean;
  enablePerformance?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface RealTimeStats {
  messagesProcessed: number;
  reportsProcessed: number;
  notificationsProcessed: number;
  connectionErrors: number;
  averageLatency: number;
  lastUpdate: Date;
}

export const useRealTimeUpdates = (config: RealTimeConfig = {}) => {
  const {
    enableReports = true,
    enableChat = true,
    enableNotifications = true,
    enablePerformance = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5
  } = config;

  const { user } = useAuthStore();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor'>('good');
  const [stats, setStats] = useState<RealTimeStats>({
    messagesProcessed: 0,
    reportsProcessed: 0,
    notificationsProcessed: 0,
    connectionErrors: 0,
    averageLatency: 0,
    lastUpdate: new Date()
  });

  const reconnectAttempts = useRef(0);
  const lastReconnectTime = useRef(0);
  const latencyMeasurements = useRef<number[]>([]);

  // Update stats helper
  const updateStats = useCallback((type: keyof RealTimeStats) => {
    setStats(prev => ({
      ...prev,
      [type]: (prev[type] as number) + 1,
      lastUpdate: new Date()
    }));
  }, []);

  // Measure latency
  const measureLatency = useCallback((startTime: number) => {
    const latency = Date.now() - startTime;
    
    // Use circular buffer
    if (latencyMeasurements.current.length >= 20) {
      latencyMeasurements.current.shift();
    }
    latencyMeasurements.current.push(latency);
    
    const avgLatency = latencyMeasurements.current.reduce((a, b) => a + b, 0) / latencyMeasurements.current.length;
    
    setStats(prev => ({
      ...prev,
      averageLatency: avgLatency
    }));

    // Update connection quality
    if (avgLatency < 30) {
      setConnectionQuality('excellent');
    } else if (avgLatency < 100) {
      setConnectionQuality('good');
    } else {
      setConnectionQuality('poor');
    }
  }, []);

  // Connection health monitoring
  useEffect(() => {
    if (!user?.id) return;

    const checkConnectionHealth = async () => {
      try {
        const startTime = Date.now();
        const response = await fetch('/api/performance');
        
        if (response.ok) {
          measureLatency(startTime);
          setIsConnected(true);
          reconnectAttempts.current = 0;
        } else {
          throw new Error('Health check failed');
        }
      } catch (error) {
        console.error('Connection health check failed:', error);
        setIsConnected(false);
        updateStats('connectionErrors');
        
        // Attempt reconnection
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const now = Date.now();
          if (now - lastReconnectTime.current > reconnectInterval) {
            reconnectAttempts.current++;
            lastReconnectTime.current = now;
            
            setTimeout(() => {
              // Trigger reconnection logic
              window.location.reload();
            }, reconnectInterval);
          }
        }
      }
    };

    // Initial health check
    checkConnectionHealth();

    // Periodic health checks
    const interval = setInterval(checkConnectionHealth, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [user?.id, reconnectInterval, maxReconnectAttempts, measureLatency, updateStats]);

  // WebSocket connection monitoring
  useEffect(() => {
    if (!enableChat || !user?.id) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, reduce activity
        console.log('Page hidden, reducing real-time activity');
      } else {
        // Page is visible, resume full activity
        console.log('Page visible, resuming real-time activity');
      }
    };

    const handleOnline = () => {
      console.log('Connection restored');
      setIsConnected(true);
      reconnectAttempts.current = 0;
    };

    const handleOffline = () => {
      console.log('Connection lost');
      setIsConnected(false);
      updateStats('connectionErrors');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enableChat, user?.id, updateStats]);

  // Performance monitoring
  useEffect(() => {
    if (!enablePerformance) return;

    const monitorPerformance = () => {
      // Monitor memory usage
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
          console.warn('High memory usage detected:', {
            used: memory.usedJSHeapSize,
            limit: memory.jsHeapSizeLimit,
            percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
          });
        }
      }

      // Monitor frame rate
      let frameCount = 0;
      const startTime = performance.now();
      
      const countFrames = () => {
        frameCount++;
        if (performance.now() - startTime < 1000) {
          requestAnimationFrame(countFrames);
        } else {
          const fps = frameCount;
          if (fps < 30) {
            console.warn('Low frame rate detected:', fps);
          }
        }
      };

      requestAnimationFrame(countFrames);
    };

    const interval = setInterval(monitorPerformance, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [enablePerformance]);

  return {
    isConnected,
    connectionQuality,
    stats,
    reconnectAttempts: reconnectAttempts.current,
    updateStats,
    measureLatency
  };
};
