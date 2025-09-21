import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, Zap, Clock, Users, MessageSquare, Activity } from 'lucide-react';
import { reportsService } from '../services/reportsService';
import { config } from '../lib/config';

interface PerformanceMetrics {
  uptime: number;
  connectionsActive: number;
  messagesProcessed: number;
  averageResponseTime: number;
  messagesPerSecond: number;
}

interface ClientMetrics {
  cachedProfiles: number;
  activeSubscriptions: number;
  pendingUpdates: number;
  debouncedUpdates: number;
}

export const PerformanceMonitor: React.FC = () => {
  const [serverMetrics, setServerMetrics] = useState<PerformanceMetrics | null>(null);
  const [clientMetrics, setClientMetrics] = useState<ClientMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchServerMetrics = useCallback(async () => {
    try {
      // Use the correct server URL (port 3001)
      const serverUrl = config.api.baseUrl;
      const response = await fetch(`${serverUrl}/api/performance`);
      if (response.ok) {
        const metrics = await response.json();
        setServerMetrics(metrics);
      }
    } catch (error) {
      // Silently ignore performance API errors for now
      console.debug('Performance API not available:', error);
    }
  }, []);

  const updateClientMetrics = useCallback(() => {
    const metrics = reportsService.getPerformanceMetrics();
    setClientMetrics(metrics);
  }, []);

  const updateMetrics = useCallback(() => {
    fetchServerMetrics();
    updateClientMetrics();
    setLastUpdate(new Date());
  }, [fetchServerMetrics, updateClientMetrics]);

  useEffect(() => {
    // Update metrics every 5 seconds
    const interval = setInterval(updateMetrics, 5000);
    updateMetrics(); // Initial update

    return () => clearInterval(interval);
  }, [updateMetrics]);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        title="Show Performance Monitor"
      >
        <Activity className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Performance Monitor
          </h3>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Server Metrics */}
          {serverMetrics && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Server Performance
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-blue-500" />
                  <span className="text-gray-600 dark:text-gray-400">Uptime:</span>
                  <span className="font-medium">{Math.floor(serverMetrics.uptime / 60)}m {serverMetrics.uptime % 60}s</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-3 h-3 text-green-500" />
                  <span className="text-gray-600 dark:text-gray-400">Connections:</span>
                  <span className="font-medium">{serverMetrics.connectionsActive}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-3 h-3 text-purple-500" />
                  <span className="text-gray-600 dark:text-gray-400">Messages:</span>
                  <span className="font-medium">{serverMetrics.messagesProcessed}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="w-3 h-3 text-orange-500" />
                  <span className="text-gray-600 dark:text-gray-400">Response:</span>
                  <span className="font-medium">{serverMetrics.averageResponseTime}ms</span>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <BarChart3 className="w-3 h-3 text-red-500" />
                  <span className="text-gray-600 dark:text-gray-400">Msg/sec:</span>
                  <span className="font-medium">{serverMetrics.messagesPerSecond}</span>
                </div>
              </div>
            </div>
          )}

          {/* Client Metrics */}
          {clientMetrics && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Client Performance
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Users className="w-3 h-3 text-blue-500" />
                  <span className="text-gray-600 dark:text-gray-400">Cached Profiles:</span>
                  <span className="font-medium">{clientMetrics.cachedProfiles}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-3 h-3 text-green-500" />
                  <span className="text-gray-600 dark:text-gray-400">Subscriptions:</span>
                  <span className="font-medium">{clientMetrics.activeSubscriptions}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-orange-500" />
                  <span className="text-gray-600 dark:text-gray-400">Pending Updates:</span>
                  <span className="font-medium">{clientMetrics.pendingUpdates}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-3 h-3 text-purple-500" />
                  <span className="text-gray-600 dark:text-gray-400">Debounced:</span>
                  <span className="font-medium">{clientMetrics.debouncedUpdates}</span>
                </div>
              </div>
            </div>
          )}

          {/* Last Update */}
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>

                     {/* Performance Status */}
           <div className="flex items-center justify-center">
             <div className={`px-3 py-1 rounded-full text-xs font-medium ${
               !serverMetrics?.averageResponseTime || serverMetrics.averageResponseTime === 0
                 ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                 : serverMetrics.averageResponseTime < 100
                 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                 : serverMetrics.averageResponseTime < 500
                 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                 : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
             }`}>
               {!serverMetrics?.averageResponseTime || serverMetrics.averageResponseTime === 0
                 ? 'Initializing...'
                 : serverMetrics.averageResponseTime < 100
                 ? 'Excellent Performance'
                 : serverMetrics.averageResponseTime < 500
                 ? 'Good Performance'
                 : 'Performance Issues Detected'
               }
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};
