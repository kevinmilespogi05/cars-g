import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Wifi, WifiOff, Clock, MessageCircle, Users } from 'lucide-react';

interface PerformanceMetrics {
  connectionQuality: 'excellent' | 'good' | 'poor';
  latency: number;
  messagesPerSecond: number;
  activeConnections: number;
  uptime: number;
  lastUpdate: Date;
}

interface RealTimePerformanceMonitorProps {
  isVisible?: boolean;
  onToggle?: () => void;
}

export const RealTimePerformanceMonitor: React.FC<RealTimePerformanceMonitorProps> = ({
  isVisible = false,
  onToggle
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    connectionQuality: 'good',
    latency: 0,
    messagesPerSecond: 0,
    activeConnections: 0,
    uptime: 0,
    lastUpdate: new Date()
  });

  const [isExpanded, setIsExpanded] = useState(false);

  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/performance');
      if (response.ok) {
        const data = await response.json();
        setMetrics(prev => ({
          ...prev,
          connectionQuality: data.averageResponseTime < 50 ? 'excellent' : 
                           data.averageResponseTime < 200 ? 'good' : 'poor',
          latency: data.averageResponseTime || 0,
          messagesPerSecond: data.messagesPerSecond || 0,
          activeConnections: data.connectionsActive || 0,
          uptime: data.uptime || 0,
          lastUpdate: new Date()
        }));
      }
    } catch (error) {
      console.error('Failed to fetch performance metrics:', error);
    }
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [isVisible, fetchMetrics]);

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-yellow-500';
      case 'poor': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getQualityIcon = (quality: string) => {
    switch (quality) {
      case 'excellent': return <Wifi size={16} className="text-green-500" />;
      case 'good': return <Wifi size={16} className="text-yellow-500" />;
      case 'poor': return <WifiOff size={16} className="text-red-500" />;
      default: return <Wifi size={16} className="text-gray-500" />;
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div 
          className="px-3 py-2 bg-gray-50 border-b border-gray-200 cursor-pointer flex items-center justify-between"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center space-x-2">
            <Activity size={16} className="text-blue-500" />
            <span className="text-sm font-medium text-gray-700">Performance</span>
            {getQualityIcon(metrics.connectionQuality)}
          </div>
          <div className="text-xs text-gray-500">
            {metrics.latency}ms
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="p-3 space-y-2">
            {/* Connection Quality */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Connection</span>
              <span className={`text-xs font-medium ${getQualityColor(metrics.connectionQuality)}`}>
                {metrics.connectionQuality.toUpperCase()}
              </span>
            </div>

            {/* Latency */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Latency</span>
              <span className="text-xs font-medium text-gray-800">
                {metrics.latency}ms
              </span>
            </div>

            {/* Messages per Second */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Messages/sec</span>
              <span className="text-xs font-medium text-gray-800">
                {metrics.messagesPerSecond.toFixed(1)}
              </span>
            </div>

            {/* Active Connections */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Connections</span>
              <span className="text-xs font-medium text-gray-800">
                {metrics.activeConnections}
              </span>
            </div>

            {/* Uptime */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Uptime</span>
              <span className="text-xs font-medium text-gray-800">
                {formatUptime(metrics.uptime)}
              </span>
            </div>

            {/* Last Update */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-xs text-gray-500">Last update</span>
              <span className="text-xs text-gray-500">
                {metrics.lastUpdate.toLocaleTimeString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
