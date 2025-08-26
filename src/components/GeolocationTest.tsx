import React, { useState } from 'react';
import { getFastLocation, getAccurateLocation, clearLocationCache } from '../lib/geolocation';
import { Clock, MapPin, Target, Zap, Trash2 } from 'lucide-react';

export function GeolocationTest() {
  const [fastResult, setFastResult] = useState<any>(null);
  const [accurateResult, setAccurateResult] = useState<any>(null);
  const [isLoadingFast, setIsLoadingFast] = useState(false);
  const [isLoadingAccurate, setIsLoadingAccurate] = useState(false);

  const testFastLocation = async () => {
    setIsLoadingFast(true);
    setFastResult(null);
    
    const startTime = performance.now();
    
    try {
      const location = await getFastLocation();
      const endTime = performance.now();
      
      setFastResult({
        location,
        time: endTime - startTime,
        success: true
      });
    } catch (error) {
      const endTime = performance.now();
      setFastResult({
        error: error instanceof Error ? error.message : 'Unknown error',
        time: endTime - startTime,
        success: false
      });
    } finally {
      setIsLoadingFast(false);
    }
  };

  const testAccurateLocation = async () => {
    setIsLoadingAccurate(true);
    setAccurateResult(null);
    
    const startTime = performance.now();
    
    try {
      const location = await getAccurateLocation();
      const endTime = performance.now();
      
      setAccurateResult({
        location,
        time: endTime - startTime,
        success: true
      });
    } catch (error) {
      const endTime = performance.now();
      setAccurateResult({
        error: error instanceof Error ? error.message : 'Unknown error',
        time: endTime - startTime,
        success: false
      });
    } finally {
      setIsLoadingAccurate(false);
    }
  };

  const handleClearCache = () => {
    clearLocationCache();
    setFastResult(null);
    setAccurateResult(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Geolocation Performance Test</h1>
        <p className="text-gray-600">Test the improved speed and accuracy of our geolocation system</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fast Location Test */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center space-x-2 mb-4">
            <Zap className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Fast Location Test</h2>
          </div>
          
          <p className="text-gray-600 mb-4">
            Get your location quickly with good accuracy (target: 20m precision in ~8 seconds)
          </p>
          
          <button
            onClick={testFastLocation}
            disabled={isLoadingFast}
            className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all duration-200 font-medium flex items-center justify-center space-x-2"
          >
            {isLoadingFast ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Getting Location...</span>
              </>
            ) : (
              <>
                <MapPin className="h-5 w-5" />
                <span>Test Fast Location</span>
              </>
            )}
          </button>

          {fastResult && (
            <div className="mt-4 p-4 rounded-lg bg-gray-50">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  Time: {fastResult.time.toFixed(0)}ms
                </span>
              </div>
              
              {fastResult.success ? (
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Coordinates:</span> {fastResult.location.lat.toFixed(6)}, {fastResult.location.lng.toFixed(6)}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Accuracy:</span> ±{fastResult.location.accuracy ? Math.round(fastResult.location.accuracy) : 'Unknown'}m
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Method:</span> {fastResult.location.method === 'gps' ? 'GPS' : 'IP-based'}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-red-600">
                  <span className="font-medium">Error:</span> {fastResult.error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Accurate Location Test */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center space-x-2 mb-4">
            <Target className="h-6 w-6 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">Accurate Location Test</h2>
          </div>
          
          <p className="text-gray-600 mb-4">
            Get your location with maximum accuracy (target: 10m precision in ~15 seconds)
          </p>
          
          <button
            onClick={testAccurateLocation}
            disabled={isLoadingAccurate}
            className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-all duration-200 font-medium flex items-center justify-center space-x-2"
          >
            {isLoadingAccurate ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Getting Location...</span>
              </>
            ) : (
              <>
                <Target className="h-5 w-5" />
                <span>Test Accurate Location</span>
              </>
            )}
          </button>

          {accurateResult && (
            <div className="mt-4 p-4 rounded-lg bg-gray-50">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  Time: {accurateResult.time.toFixed(0)}ms
                </span>
              </div>
              
              {accurateResult.success ? (
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Coordinates:</span> {accurateResult.location.lat.toFixed(6)}, {accurateResult.location.lng.toFixed(6)}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Accuracy:</span> ±{accurateResult.location.accuracy ? Math.round(accurateResult.location.accuracy) : 'Unknown'}m
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Method:</span> {accurateResult.location.method === 'gps' ? 'GPS' : 'IP-based'}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-red-600">
                  <span className="font-medium">Error:</span> {accurateResult.error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cache Management */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cache Management</h3>
            <p className="text-gray-600">
              Clear the location cache to test fresh location requests
            </p>
          </div>
          <button
            onClick={handleClearCache}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-all duration-200 flex items-center space-x-2"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear Cache</span>
          </button>
        </div>
      </div>

      {/* Performance Tips */}
      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Performance Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <h4 className="font-medium mb-2">For Speed:</h4>
            <ul className="space-y-1">
              <li>• Use "Fast Location" for quick results</li>
              <li>• Accepts positions up to 5 seconds old</li>
              <li>• Target accuracy: 20 meters</li>
              <li>• Typical time: 3-8 seconds</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">For Accuracy:</h4>
            <ul className="space-y-1">
              <li>• Use "Accurate Location" for precision</li>
              <li>• Always gets fresh GPS position</li>
              <li>• Target accuracy: 10 meters</li>
              <li>• Typical time: 8-15 seconds</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
