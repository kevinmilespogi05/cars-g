import React from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, Bell, AlertCircle, Info } from 'lucide-react';

export interface Anomaly {
  id: string;
  type: 'spike' | 'drop' | 'unusual_pattern' | 'threshold_breach';
  severity: 'high' | 'medium' | 'low';
  metric: string;
  current: number;
  expected: number;
  deviation: number;
  timestamp: string;
  description: string;
  recommendation?: string;
}

interface AnomalyDetectionProps {
  anomalies: Anomaly[];
  onAnomalyClick?: (anomaly: Anomaly) => void;
  onDismiss?: (anomalyId: string) => void;
}

export function AnomalyDetection({ anomalies, onAnomalyClick, onDismiss }: AnomalyDetectionProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'border-red-300 bg-red-50';
      case 'medium':
        return 'border-yellow-300 bg-yellow-50';
      case 'low':
        return 'border-blue-300 bg-blue-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'medium':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'low':
        return <Info className="h-5 w-5 text-blue-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'spike':
        return <TrendingUp className="h-5 w-5" />;
      case 'drop':
        return <TrendingDown className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'spike':
        return 'Unusual Spike';
      case 'drop':
        return 'Unusual Drop';
      case 'unusual_pattern':
        return 'Unusual Pattern';
      case 'threshold_breach':
        return 'Threshold Breach';
      default:
        return 'Anomaly Detected';
    }
  };

  const highSeverityCount = anomalies.filter(a => a.severity === 'high').length;
  const mediumSeverityCount = anomalies.filter(a => a.severity === 'medium').length;
  const lowSeverityCount = anomalies.filter(a => a.severity === 'low').length;

  if (anomalies.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div>
            <h3 className="text-base font-semibold text-green-900">No Anomalies Detected</h3>
            <p className="text-sm text-green-700 mt-1">
              All metrics are within expected ranges. System is operating normally.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-red-50 to-yellow-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="h-6 w-6 text-red-600" />
              {highSeverityCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {highSeverityCount}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Anomaly Detection</h3>
              <p className="text-sm text-gray-600">
                {anomalies.length} anomal{anomalies.length === 1 ? 'y' : 'ies'} detected
              </p>
            </div>
          </div>
          
          {/* Severity Summary */}
          <div className="flex items-center gap-2">
            {highSeverityCount > 0 && (
              <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                {highSeverityCount} High
              </span>
            )}
            {mediumSeverityCount > 0 && (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">
                {mediumSeverityCount} Medium
              </span>
            )}
            {lowSeverityCount > 0 && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                {lowSeverityCount} Low
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Anomalies List */}
      <div className="p-6">
        <div className="space-y-4">
          {anomalies.map((anomaly) => (
            <div
              key={anomaly.id}
              className={`border-2 rounded-lg overflow-hidden transition-all hover:shadow-md ${getSeverityColor(anomaly.severity)}`}
            >
              <div className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getSeverityIcon(anomaly.severity)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${
                          anomaly.severity === 'high' ? 'bg-red-100 text-red-700' :
                          anomaly.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {anomaly.severity.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">{getTypeLabel(anomaly.type)}</span>
                      </div>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {new Date(anomaly.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <h4 className="text-base font-semibold text-gray-900 mb-2">
                      {anomaly.metric}
                    </h4>
                    
                    <p className="text-sm text-gray-700 mb-3">
                      {anomaly.description}
                    </p>

                    {/* Metrics Comparison */}
                    <div className="grid grid-cols-3 gap-4 mb-3 p-3 bg-white rounded-lg border border-gray-200">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Current Value</p>
                        <p className="text-lg font-bold text-gray-900">{anomaly.current.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Expected Value</p>
                        <p className="text-lg font-bold text-gray-600">{anomaly.expected.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Deviation</p>
                        <div className="flex items-center gap-1">
                          {getTypeIcon(anomaly.type)}
                          <p className={`text-lg font-bold ${
                            anomaly.type === 'spike' ? 'text-red-600' : 'text-orange-600'
                          }`}>
                            {Math.abs(anomaly.deviation).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Recommendation */}
                    {anomaly.recommendation && (
                      <div className="bg-white rounded-lg border border-gray-200 p-3">
                        <p className="text-xs font-semibold text-gray-700 mb-1">Recommendation</p>
                        <p className="text-sm text-gray-600">{anomaly.recommendation}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => onAnomalyClick?.(anomaly)}
                      className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200 transition-colors"
                    >
                      Investigate
                    </button>
                    {onDismiss && (
                      <button
                        onClick={() => onDismiss(anomaly.id)}
                        className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Visual indicator bar */}
              <div className={`h-1 ${
                anomaly.severity === 'high' ? 'bg-red-500' :
                anomaly.severity === 'medium' ? 'bg-yellow-500' :
                'bg-blue-500'
              }`}></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

