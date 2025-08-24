import { useEffect, useRef, useCallback, useState } from 'react';
import { reportsService } from '../services/reportsService';
import { useChatSocket } from './useChatSocket';
import { useAuthStore } from '../store/authStore';

interface RealTimeConfig {
  enableReports?: boolean;
  enableChat?: boolean;
  enableNotifications?: boolean;
  debounceDelay?: number;
  batchDelay?: number;
  maxRetries?: number;
}

interface RealTimeStats {
  reportsProcessed: number;
  messagesProcessed: number;
  notificationsProcessed: number;
  averageLatency: number;
  connectionQuality: 'excellent' | 'good' | 'poor';
  lastUpdate: Date;
}

export const useOptimizedRealTime = (config: RealTimeConfig = {}) => {
  const {
    enableReports = true,
    enableChat = true,
    enableNotifications = true,
    debounceDelay = 100,
    batchDelay = 50,
    maxRetries = 3
  } = config;

  const { user } = useAuthStore();
  const [stats, setStats] = useState<RealTimeStats>({
    reportsProcessed: 0,
    messagesProcessed: 0,
    notificationsProcessed: 0,
    averageLatency: 0,
    connectionQuality: 'good',
    lastUpdate: new Date()
  });

  const [isConnected, setIsConnected] = useState(false);
  const [connectionErrors, setConnectionErrors] = useState(0);
  const retryCountRef = useRef(0);
  const latencyMeasurements = useRef<number[]>([]);
  const lastActivityRef = useRef<Date>(new Date());

  // Performance monitoring
  const updateStats = useCallback((type: keyof Omit<RealTimeStats, 'averageLatency' | 'connectionQuality' | 'lastUpdate'>, count: number = 1) => {
    setStats(prev => ({
      ...prev,
      [type]: (prev[type] as number) + count,
      lastUpdate: new Date()
    }));
  }, []);

  const measureLatency = useCallback((startTime: number) => {
    const latency = Date.now() - startTime;
    latencyMeasurements.current.push(latency);
    
    // Keep only last 10 measurements
    if (latencyMeasurements.current.length > 10) {
      latencyMeasurements.current.shift();
    }
    
    const avgLatency = latencyMeasurements.current.reduce((a, b) => a + b, 0) / latencyMeasurements.current.length;
    
    setStats(prev => ({
      ...prev,
      averageLatency: Math.round(avgLatency),
      connectionQuality: avgLatency < 100 ? 'excellent' : avgLatency < 500 ? 'good' : 'poor'
    }));
  }, []);

  // Optimized chat socket with performance monitoring
  const chatSocket = useChatSocket({
    userId: user?.id || '',
    onMessage: (message) => {
      const startTime = Date.now();
      updateStats('messagesProcessed');
      measureLatency(startTime);
    },
    onAuthenticated: () => {
      setIsConnected(true);
      setConnectionErrors(0);
      retryCountRef.current = 0;
    },
    onAuthError: (error) => {
      console.error('Chat authentication error:', error);
      setConnectionErrors(prev => prev + 1);
      
      // Retry logic
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        setTimeout(() => {
          // Reconnect logic handled by useChatSocket
        }, Math.pow(2, retryCountRef.current) * 1000); // Exponential backoff
      }
    }
  });

  // Optimized reports subscriptions
  useEffect(() => {
    if (!enableReports || !user?.id) return;

    const startTime = Date.now();
    
    const unsubscribeReports = reportsService.subscribeToReports((report) => {
      updateStats('reportsProcessed');
      measureLatency(startTime);
    });

    const unsubscribeStatus = reportsService.subscribeToReportStatusChanges((reportId, newStatus) => {
      updateStats('reportsProcessed');
      measureLatency(startTime);
    });

    const unsubscribeLikes = reportsService.subscribeToLikesChanges((reportId, likeCount) => {
      updateStats('reportsProcessed');
      measureLatency(startTime);
    });

    const unsubscribeComments = reportsService.subscribeToCommentsChanges((reportId, commentCount) => {
      updateStats('reportsProcessed');
      measureLatency(startTime);
    });

    return () => {
      unsubscribeReports();
      unsubscribeStatus();
      unsubscribeLikes();
      unsubscribeComments();
    };
  }, [enableReports, user?.id, updateStats, measureLatency]);

  // Connection health monitoring
  useEffect(() => {
    const healthCheck = setInterval(() => {
      const now = new Date();
      const timeSinceLastActivity = now.getTime() - lastActivityRef.current.getTime();
      
      // If no activity for 30 seconds, consider connection poor
      if (timeSinceLastActivity > 30000) {
        setStats(prev => ({
          ...prev,
          connectionQuality: 'poor'
        }));
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(healthCheck);
  }, []);

  // Activity tracking
  const trackActivity = useCallback(() => {
    lastActivityRef.current = new Date();
  }, []);

  // Optimized notification handling
  const handleNotification = useCallback((notification: any) => {
    const startTime = Date.now();
    updateStats('notificationsProcessed');
    measureLatency(startTime);
    trackActivity();
  }, [updateStats, measureLatency, trackActivity]);

  // Performance optimization utilities
  const optimizeConnection = useCallback(() => {
    // Clear caches if performance is poor
    if (stats.connectionQuality === 'poor') {
      reportsService.clearCache();
      setConnectionErrors(0);
      retryCountRef.current = 0;
    }
  }, [stats.connectionQuality]);

  const getPerformanceReport = useCallback(() => {
    return {
      ...stats,
      connectionErrors,
      retryCount: retryCountRef.current,
      isConnected: chatSocket.isConnected,
      isAuthenticated: chatSocket.isAuthenticated,
      recommendations: []
    };
  }, [stats, connectionErrors, chatSocket.isConnected, chatSocket.isAuthenticated]);

  // Auto-optimization based on performance
  useEffect(() => {
    if (stats.connectionQuality === 'poor' && connectionErrors > 2) {
      optimizeConnection();
    }
  }, [stats.connectionQuality, connectionErrors, optimizeConnection]);

  return {
    // Connection state
    isConnected: chatSocket.isConnected && isConnected,
    isAuthenticated: chatSocket.isAuthenticated,
    connectionQuality: stats.connectionQuality,
    
    // Performance stats
    stats,
    performanceReport: getPerformanceReport(),
    
    // Chat methods
    sendMessage: chatSocket.sendMessage,
    joinConversation: chatSocket.joinConversation,
    leaveConversation: chatSocket.leaveConversation,
    startTyping: chatSocket.startTyping,
    stopTyping: chatSocket.stopTyping,
    
    // Optimization methods
    optimizeConnection,
    trackActivity,
    handleNotification,
    
    // Error handling
    connectionErrors,
    retryCount: retryCountRef.current
  };
};
