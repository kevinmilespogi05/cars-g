import React from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { Wifi, WifiOff, RefreshCw, Globe, Server } from 'lucide-react';

export function NetworkTest() {
  const { 
    isOnline, 
    isChecking, 
    lastChecked, 
    connectionType, 
    effectiveType, 
    checkConnection, 
    forceOnline 
  } = useNetworkStatus();

  const testEndpoints = [
    { name: 'Local Manifest', url: '/manifest.webmanifest' },
    { name: 'Google', url: 'https://www.google.com/favicon.ico' },
    { name: 'Cloudinary', url: 'https://res.cloudinary.com' },
    { name: 'Supabase', url: 'https://supabase.com' }
  ];

  const [testResults, setTestResults] = React.useState<Record<string, boolean>>({});
  const [isTesting, setIsTesting] = React.useState(false);

  const testAllEndpoints = async () => {
    setIsTesting(true);
    const results: Record<string, boolean> = {};

    for (const endpoint of testEndpoints) {
      try {
        const response = await fetch(endpoint.url, {
          method: 'HEAD',
          cache: 'no-cache',
          signal: AbortSignal.timeout(5000)
        });
        results[endpoint.name] = response.ok;
      } catch (error) {
        results[endpoint.name] = false;
      }
    }

    setTestResults(results);
    setIsTesting(false);
  };

  const getStatusColor = (status: boolean) => {
    return status ? 'text-green-600' : 'text-red-600';
  };

  const getStatusIcon = (status: boolean) => {
    return status ? '✓' : '✗';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Network Status Test</h1>
          
          {/* Current Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Current Status</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="font-medium">
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  Connection: {connectionType}
                </div>
                {effectiveType !== 'unknown' && (
                  <div className="text-sm text-gray-600">
                    Speed: {effectiveType.toUpperCase()}
                  </div>
                )}
                {lastChecked && (
                  <div className="text-sm text-gray-600">
                    Last checked: {lastChecked.toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={checkConnection}
                  disabled={isChecking}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                >
                  {isChecking ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span>{isChecking ? 'Checking...' : 'Check Connection'}</span>
                </button>
                
                <button
                  onClick={forceOnline}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Wifi className="h-4 w-4" />
                  <span>Force Online</span>
                </button>
              </div>
            </div>
          </div>

          {/* Endpoint Tests */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Endpoint Tests</h3>
            <div className="space-y-3">
              {testEndpoints.map((endpoint) => (
                <div key={endpoint.name} className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Globe className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{endpoint.name}</span>
                    <span className="text-sm text-gray-500">({endpoint.url})</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {testResults[endpoint.name] !== undefined ? (
                      <span className={`font-bold ${getStatusColor(testResults[endpoint.name])}`}>
                        {getStatusIcon(testResults[endpoint.name])}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <button
              onClick={testAllEndpoints}
              disabled={isTesting}
              className="mt-4 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {isTesting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Server className="h-4 w-4" />
              )}
              <span>{isTesting ? 'Testing...' : 'Test All Endpoints'}</span>
            </button>
          </div>

          {/* Browser Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Browser Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-600">User Agent:</div>
                <div className="font-mono text-xs bg-gray-100 p-2 rounded mt-1">
                  {navigator.userAgent}
                </div>
              </div>
              <div>
                <div className="text-gray-600">Platform:</div>
                <div className="font-mono text-xs bg-gray-100 p-2 rounded mt-1">
                  {navigator.platform}
                </div>
              </div>
              <div>
                <div className="text-gray-600">Language:</div>
                <div className="font-mono text-xs bg-gray-100 p-2 rounded mt-1">
                  {navigator.language}
                </div>
              </div>
              <div>
                <div className="text-gray-600">Cookies Enabled:</div>
                <div className="font-mono text-xs bg-gray-100 p-2 rounded mt-1">
                  {navigator.cookieEnabled ? 'Yes' : 'No'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
