import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Info
} from 'lucide-react';
import { useOutageHandler } from '../lib/supabaseOutageHandler.tsx';

export function SupabaseOutageIndicator() {
  const { state, checkConnection, retryConnection, resetOutageState } = useOutageHandler();
  const [showDetails, setShowDetails] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Don't show if everything is fine
  if (state.connectionStatus === 'online' && !state.isOutage) {
    return null;
  }

  const getStatusIcon = () => {
    switch (state.connectionStatus) {
      case 'online':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'connecting':
        return <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'offline':
        return <WifiOff className="h-5 w-5 text-red-600" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Database className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    switch (state.connectionStatus) {
      case 'online':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'connecting':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'offline':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'degraded':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getStatusText = () => {
    switch (state.connectionStatus) {
      case 'online':
        return 'Supabase Connected';
      case 'connecting':
        return 'Connecting to Supabase...';
      case 'offline':
        return 'Supabase Unavailable';
      case 'degraded':
        return 'Supabase Degraded';
      default:
        return 'Unknown Status';
    }
  };

  const getOutageDuration = () => {
    if (!state.outageStart) return null;
    const duration = Date.now() - state.outageStart.getTime();
    const minutes = Math.floor(duration / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await retryConnection();
    } finally {
      setIsRetrying(false);
    }
  };

  const handleManualCheck = async () => {
    setIsRetrying(true);
    try {
      await checkConnection();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className={`fixed top-4 right-4 max-w-sm w-full bg-white rounded-lg shadow-lg border-2 ${getStatusColor()} z-50`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <h3 className="font-semibold text-sm">{getStatusText()}</h3>
              {state.isOutage && state.outageStart && (
                <p className="text-xs opacity-75">
                  Outage duration: {getOutageDuration()}
                </p>
              )}
            </div>
          </div>
          
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>

        {/* Details Panel */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-current border-opacity-20 overflow-hidden"
            >
              <div className="p-4 space-y-3">
                {/* Connection Info */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Status:</span>
                    <span className="font-medium capitalize">{state.connectionStatus}</span>
                  </div>
                  
                  {state.lastConnected && (
                    <div className="flex justify-between text-xs">
                      <span>Last Connected:</span>
                      <span className="font-medium">
                        {state.lastConnected.toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                  
                  {state.retryCount > 0 && (
                    <div className="flex justify-between text-xs">
                      <span>Retry Attempts:</span>
                      <span className="font-medium">
                        {state.retryCount}/{state.maxRetries}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={handleRetry}
                    disabled={isRetrying || state.retryCount >= state.maxRetries}
                    className="flex-1 flex items-center justify-center px-3 py-2 bg-current text-white rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isRetrying ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    {isRetrying ? 'Retrying...' : 'Retry Connection'}
                  </button>
                  
                  <button
                    onClick={handleManualCheck}
                    disabled={isRetrying}
                    className="flex-1 flex items-center justify-center px-3 py-2 bg-white bg-opacity-20 text-current rounded text-sm font-medium hover:bg-opacity-30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Wifi className="h-4 w-4 mr-2" />
                    Check
                  </button>
                </div>

                {/* Reset Button */}
                {state.isOutage && (
                  <button
                    onClick={resetOutageState}
                    className="w-full px-3 py-2 bg-white bg-opacity-20 text-current rounded text-sm font-medium hover:bg-opacity-30 transition-colors"
                  >
                    Reset Status
                  </button>
                )}

                {/* Offline Mode Info */}
                {state.isOutage && (
                  <div className="bg-white bg-opacity-20 rounded p-3 text-xs">
                    <p className="font-medium mb-1">Offline Mode Active</p>
                    <p className="opacity-75">
                      The app is running with cached data. Some features may be limited.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Auto-hide after 10 seconds if online */}
        {state.connectionStatus === 'online' && (
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: 10, ease: 'linear' }}
            className="h-1 bg-green-600 rounded-b-lg"
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
