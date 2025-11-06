import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin, Loader2, Target, Crosshair, Navigation, ChevronDown, ChevronUp, CheckCircle2, AlertCircle } from 'lucide-react';
import { 
  getEnhancedLocation, 
  getFastLocation,
  GEOLOCATION_OPTIONS, 
  startLocationMonitoring as startLocationMonitoringLib,
  // formatLocation,
  type EnhancedLocation 
} from '../lib/geolocation';
// import { getPositionWithRetry } from '../lib/geolocation';

// Fix for default marker icons in Leaflet with React
// This is needed because Leaflet's default marker icons don't work properly with React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapPickerProps {
  onLocationSelect: (location: { lat: number; lng: number; address?: string }) => void;
  initialLocation?: { lat: number; lng: number };
}



// Component to handle map events
function MapEvents({ onLocationSelect }: { onLocationSelect: (location: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click: (e) => {
      onLocationSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export function MapPicker({ onLocationSelect, initialLocation }: MapPickerProps) {
  const [position, setPosition] = useState<{ lat: number; lng: number }>(
    initialLocation || { lat: 51.505, lng: -0.09 } // Default to London if no initial location
  );
  const [address, setAddress] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showLocationButton, setShowLocationButton] = useState(true);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [locationMethod, setLocationMethod] = useState<string>('');
  const [isHighAccuracyMode, setIsHighAccuracyMode] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [coordsExpanded, setCoordsExpanded] = useState(true);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const mapRef = useRef<L.Map>(null);
  const monitoringCleanupRef = useRef<(() => void) | null>(null);
  const bestAccuracyRef = useRef<number | null>(null);
  const desiredAccuracyMeters = 8; // Target precision



  // Enhanced location getting with multiple methods
  const getLocation = async () => {
    if (!("geolocation" in navigator)) {
      setError('Geolocation is not supported by your browser. Please select a location manually on the map.');
      setShowLocationButton(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Use ultra-fast location service for immediate response
      const enhancedLocation = await getFastLocation();
      
      setLocationMethod(enhancedLocation.method === 'gps' ? 'Fast GPS Location' : 'IP-based (approximate)');
      setIsHighAccuracyMode(enhancedLocation.method === 'gps');
      updatePosition(enhancedLocation);
      
      // Start continuous monitoring for better precision if GPS is available
      if (enhancedLocation.method === 'gps') {
        startContinuousMonitoring();
      }

    } catch (error) {
      console.error('Error getting location:', error);
      handleLocationError(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get location with high accuracy (slower but more precise)
  const getAccurateLocation = async () => {
    if (!("geolocation" in navigator)) {
      setError('Geolocation is not supported by your browser. Please select a location manually on the map.');
      setShowLocationButton(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Use high precision location service for maximum accuracy
      const enhancedLocation = await getEnhancedLocation(GEOLOCATION_OPTIONS.HIGH_PRECISION);
      
      setLocationMethod(enhancedLocation.method === 'gps' ? 'High Accuracy GPS (Precise)' : 'IP-based (approximate)');
      setIsHighAccuracyMode(enhancedLocation.method === 'gps');
      updatePosition(enhancedLocation);
      
      // Start continuous monitoring for better precision if GPS is available
      if (enhancedLocation.method === 'gps') {
        startContinuousMonitoring();
      }

    } catch (error) {
      console.error('Error getting accurate location:', error);
      handleLocationError(error);
    } finally {
      setIsLoading(false);
    }
  };



  // Start continuous location monitoring for better precision
  const startContinuousMonitoring = () => {
    // Clean up any previous monitoring
    if (monitoringCleanupRef.current) {
      try { monitoringCleanupRef.current(); } catch {}
      monitoringCleanupRef.current = null;
    }

    const cleanup = startLocationMonitoringLib(
      (enhancedLocation) => {
        // Only update if accuracy is better than current
        const currentAccuracy = accuracy || Infinity;
        if (enhancedLocation.accuracy && enhancedLocation.accuracy < currentAccuracy) {
          updatePosition(enhancedLocation);
          bestAccuracyRef.current = enhancedLocation.accuracy;
          // Stop monitoring once we reach desired precision
          if (enhancedLocation.accuracy <= desiredAccuracyMeters && monitoringCleanupRef.current) {
            try { monitoringCleanupRef.current(); } catch {}
            monitoringCleanupRef.current = null;
          }
        }
      },
      GEOLOCATION_OPTIONS.ULTRA_FAST
    );

    // Store cleanup function
    monitoringCleanupRef.current = cleanup;
  };

  // Update position with enhanced information
  const updatePosition = (position: GeolocationPosition | EnhancedLocation) => {
    let newPos: { lat: number; lng: number };
    let newAccuracy: number | null = null;

    if ('coords' in position) {
      // GeolocationPosition
      newPos = { 
        lat: position.coords.latitude, 
        lng: position.coords.longitude 
      };
      newAccuracy = position.coords.accuracy || null;
    } else {
      // EnhancedLocation
      newPos = { 
        lat: position.lat, 
        lng: position.lng 
      };
      newAccuracy = position.accuracy || null;
    }

    setPosition(newPos);
    setAccuracy(newAccuracy);
    reverseGeocode(newPos);
    
    // Show success animation
    setShowSuccessAnimation(true);
    setTimeout(() => setShowSuccessAnimation(false), 2000);
  };

  // Enhanced error handling
  const handleLocationError = (error: any) => {
    if (error.code === 1) {
      setError('Location access was denied. Please enable location access in your browser settings and try again.');
      setShowLocationButton(false);
    } else if (error.code === 2) {
      setError('Location is unavailable. Please check your device settings and ensure location services are enabled.');
    } else if (error.code === 3) {
      setError('Location request timed out. Please check your internet connection and try again.');
    } else {
      setError('Unable to get your location. Please check your device settings and try again.');
    }
  };

  // Get user's location on component mount
  useEffect(() => {
    if (!initialLocation) {
      getLocation();
    }
  }, [initialLocation]);

  // Cleanup location monitoring on unmount
  useEffect(() => {
    return () => {
      if (monitoringCleanupRef.current) {
        try { monitoringCleanupRef.current(); } catch {}
        monitoringCleanupRef.current = null;
      }
    };
  }, []);

  // Update map view when position changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView([position.lat, position.lng], 19); // Increased zoom for better precision
    }
  }, [position]);

  // Reverse geocode to get address from coordinates
  const reverseGeocode = async (coords: { lat: number; lng: number }) => {
    const attempt = async (tries: number, delayMs: number): Promise<void> => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&zoom=18&addressdetails=1`
        );
        const data = await response.json();
        if (data.display_name) {
          setAddress(data.display_name);
          onLocationSelect({ ...coords, address: data.display_name });
        }
      } catch (error) {
        if (tries > 0) {
          await new Promise(r => setTimeout(r, delayMs));
          return attempt(tries - 1, delayMs * 2);
        }
        // Silent fail + lightweight toast
        console.warn('Reverse geocoding failed after retries');
        try {
          const toast = document.createElement('div');
          toast.textContent = 'Could not fetch address (using coordinates only)';
          toast.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-3 py-2 rounded shadow z-[1000]';
          document.body.appendChild(toast);
          setTimeout(() => toast.remove(), 2500);
        } catch {}
      }
    };
    // Non-blocking UI: don't set isLoading for address enrichment
    attempt(2, 400);
  };

  return (
    <div className="w-full h-[500px] sm:h-[550px] rounded-lg overflow-hidden border border-gray-300 relative z-0">
      {/* Error Banner - Top */}
      {error && (
        <div className="absolute top-0 left-0 right-0 bg-yellow-50/95 backdrop-blur-sm border-b border-yellow-200 text-yellow-800 px-4 py-2.5 text-sm flex items-center justify-between z-[1001] shadow-sm">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{error}</span>
          </div>
          {!showLocationButton && (
            <button
              onClick={() => {
                setShowLocationButton(true);
                setError('');
              }}
              className="ml-3 text-yellow-800 hover:text-yellow-900 underline text-sm font-medium flex-shrink-0"
              aria-label="Try again to get location"
            >
              Try Again
            </button>
          )}
        </div>
      )}
      
      {/* Location Status Banner - Below error or top */}
      {(locationMethod || accuracy) && !error && (
        <div className="absolute top-0 left-0 right-0 bg-blue-50/95 backdrop-blur-sm border-b border-blue-200 text-blue-800 px-4 py-2 text-xs flex items-center justify-between z-[1001] shadow-sm">
          <div className="flex items-center gap-2">
            {isHighAccuracyMode ? (
              <Target className="h-3.5 w-3.5" />
            ) : (
              <Crosshair className="h-3.5 w-3.5" />
            )}
            <span className="font-medium">{locationMethod}</span>
            {accuracy && (
              <span className="text-blue-700">• Accuracy: ±{Math.round(accuracy)}m</span>
            )}
          </div>
          {isHighAccuracyMode && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="font-medium">Live</span>
            </div>
          )}
        </div>
      )}

      <MapContainer
        center={[position.lat, position.lng]}
        zoom={19}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
        scrollWheelZoom={true}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Top-Right: Action Buttons Group - Vertical Stack */}
        <div className="absolute top-14 right-3 z-[1000] flex flex-col gap-2">
          {/* Manual Coordinate Entry Button */}
          <div className="bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-gray-200/50 overflow-visible">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowManual(v => !v);
              }}
              disabled={isLoading}
              className="w-full min-h-[44px] px-4 py-2.5 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50 transition-all duration-200 text-sm font-medium flex items-center justify-center gap-2 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              title="Enter coordinates manually"
              aria-label={showManual ? "Hide coordinate input" : "Enter coordinates manually"}
              aria-expanded={showManual}
            >
              <Navigation className="h-4 w-4 text-gray-700 flex-shrink-0" />
              <span className="text-gray-900">{showManual ? 'Hide' : 'Enter Coords'}</span>
            </button>
            {showManual && (
              <div className="p-3 space-y-2 border-t border-gray-200 bg-white">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g., 14.8257"
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    aria-label="Enter latitude coordinate"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g., 120.2815"
                    value={manualLng}
                    onChange={(e) => setManualLng(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    aria-label="Enter longitude coordinate"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const lat = parseFloat(manualLat);
                    const lng = parseFloat(manualLng);
                    if (isFinite(lat) && isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                      const coords = { lat, lng };
                      setPosition(coords);
                      reverseGeocode(coords);
                      setShowManual(false);
                      setManualLat('');
                      setManualLng('');
                    } else {
                      setError('Invalid coordinates. Latitude must be between -90 and 90, Longitude between -180 and 180.');
                    }
                  }}
                  className="w-full min-h-[44px] px-3 py-2.5 bg-primary-600 text-white rounded-md hover:bg-primary-700 active:bg-primary-800 transition-all duration-200 text-sm font-medium flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  aria-label="Set location from entered coordinates"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Set Location</span>
                </button>
              </div>
            )}
          </div>

          {/* Location Buttons - Only show if location button is enabled */}
          {showLocationButton && (
            <div className="bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-gray-200/50 overflow-visible">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  getLocation();
                }}
                disabled={isLoading}
                className="w-full min-h-[44px] px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium text-white flex items-center justify-center gap-2 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                title="Get my location quickly (fastest option)"
                aria-label="Get my location quickly"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                ) : (
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                )}
                <span>Fast Location</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  getAccurateLocation();
                }}
                disabled={isLoading}
                className="w-full min-h-[44px] px-4 py-2.5 bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium text-white flex items-center justify-center gap-2 border-t border-green-500/30 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                title="Get my location with maximum accuracy (slower but more precise)"
                aria-label="Get my location with maximum accuracy"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                ) : (
                  <Target className="h-4 w-4 flex-shrink-0" />
                )}
                <span>Accurate Location</span>
              </button>
            </div>
          )}
        </div>

        {/* Show accuracy circle when available */}
        {accuracy && accuracy > 0 && (
          <Circle
            center={[position.lat, position.lng]}
            radius={Math.max(accuracy, 5)}
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, weight: 1 }}
          />
        )}

        <Marker 
          position={[position.lat, position.lng]}
          draggable={true}
          eventHandlers={{
            dragend: (e) => {
              const marker = e.target;
              const position = marker.getLatLng();
              setPosition({ lat: position.lat, lng: position.lng });
              reverseGeocode({ lat: position.lat, lng: position.lng });
            }
          }}
        >
          <Popup>
            <div className="text-sm">
              {isLoading ? 'Loading address...' : address || 'Selected location'}
              {accuracy && (
                <div className="text-xs text-gray-500 mt-1">
                  Accuracy: ±{Math.round(accuracy)}m
                </div>
              )}
            </div>
          </Popup>
        </Marker>
        <MapEvents onLocationSelect={(loc) => {
          setPosition(loc);
          reverseGeocode(loc);
        }} />
        
        {/* Bottom-Left: Coordinate Display Box - Collapsible */}
        <div className={`absolute bottom-3 left-3 z-[1000] bg-white/98 backdrop-blur-md rounded-lg shadow-xl border-2 border-primary-500/30 transition-all duration-300 ${
          coordsExpanded ? 'min-w-[280px]' : 'min-w-[200px]'
        }`}>
          {/* Header with collapse toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setCoordsExpanded(!coordsExpanded);
            }}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors rounded-t-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset"
            aria-label={coordsExpanded ? "Collapse coordinates" : "Expand coordinates"}
            aria-expanded={coordsExpanded}
          >
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary-600 flex-shrink-0" />
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Selected Coordinates</span>
              {showSuccessAnimation && (
                <CheckCircle2 className="h-4 w-4 text-green-500 animate-pulse" />
              )}
            </div>
            {coordsExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            )}
          </button>
          
          {coordsExpanded && (
            <div className="px-4 pb-3 space-y-2">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-700 min-w-[45px]">Lat:</span>
                  <span className="text-sm font-mono font-semibold text-gray-900 bg-gray-50 px-2.5 py-1.5 rounded-md border border-gray-200 flex-1">
                    {Number.isFinite(position.lat) ? position.lat.toFixed(6) : position.lat}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-700 min-w-[45px]">Lng:</span>
                  <span className="text-sm font-mono font-semibold text-gray-900 bg-gray-50 px-2.5 py-1.5 rounded-md border border-gray-200 flex-1">
                    {Number.isFinite(position.lng) ? position.lng.toFixed(6) : position.lng}
                  </span>
                </div>
              </div>
              {address && (
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-600 line-clamp-2" title={address}>
                    {address}
                  </p>
                </div>
              )}
              {accuracy && (
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex items-center gap-1.5 text-xs text-gray-600">
                    <Target className="h-3 w-3" />
                    <span>Accuracy: ±{Math.round(accuracy)}m</span>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Collapsed view - show just coordinates */}
          {!coordsExpanded && (
            <div className="px-4 pb-2.5">
              <div className="text-xs font-mono text-gray-700">
                {Number.isFinite(position.lat) ? position.lat.toFixed(4) : position.lat}, {Number.isFinite(position.lng) ? position.lng.toFixed(4) : position.lng}
              </div>
            </div>
          )}
        </div>
      </MapContainer>
    </div>
  );
}