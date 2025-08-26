import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin, Loader2, Target, Crosshair } from 'lucide-react';
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
    <div className="w-full h-72 sm:h-80 rounded-lg overflow-hidden border border-gray-300 relative z-0">
      {error && (
        <div className="absolute top-0 left-0 right-0 bg-yellow-100 text-yellow-800 p-2 text-sm flex items-center justify-between z-10">
          <span>{error}</span>
          {!showLocationButton && (
            <button
              onClick={() => {
                setShowLocationButton(true);
                setError('');
              }}
              className="ml-2 text-yellow-800 hover:text-yellow-900 underline"
            >
              Try Again
            </button>
          )}
        </div>
      )}
      
      {/* Location Status Bar */}
      {(locationMethod || accuracy) && (
        <div className="absolute top-0 left-0 right-0 bg-blue-50 text-blue-800 p-2 text-xs flex items-center justify-between z-10">
          <div className="flex items-center space-x-2">
            {isHighAccuracyMode ? (
              <Target className="h-3 w-3" />
            ) : (
              <Crosshair className="h-3 w-3" />
            )}
            <span className="font-medium">{locationMethod}</span>
            {accuracy && (
              <span>• Accuracy: ±{Math.round(accuracy)}m</span>
            )}
          </div>
          {isHighAccuracyMode && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live</span>
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
        {/* Manual coordinate entry */}
        <div className="absolute top-12 left-2 z-10 bg-white rounded-md shadow p-2 space-y-2 w-60">
          <button
            type="button"
            onClick={() => setShowManual(v => !v)}
            className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
            title="Enter coordinates manually"
          >
            {showManual ? 'Hide coordinates' : 'Enter coordinates'}
          </button>
          {showManual && (
            <div className="space-y-1">
              <input
                type="number"
                step="any"
                placeholder="Latitude"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
              />
              <input
                type="number"
                step="any"
                placeholder="Longitude"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  const lat = parseFloat(manualLat);
                  const lng = parseFloat(manualLng);
                  if (isFinite(lat) && isFinite(lng)) {
                    const coords = { lat, lng };
                    setPosition(coords);
                    reverseGeocode(coords);
                    setShowManual(false);
                  }
                }}
                className="w-full text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Set location
              </button>
            </div>
          )}
        </div>
        {showLocationButton && (
          <div className="absolute top-12 right-2 z-10 bg-white rounded-lg shadow-md p-2 space-y-2">
            <button
              onClick={getLocation}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-all duration-200 text-sm font-medium flex items-center justify-center space-x-2"
              title="Get my location quickly (fastest option)"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
              <span>Fast Location</span>
            </button>
            <button
              onClick={getAccurateLocation}
              disabled={isLoading}
              className="w-full bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 transition-all duration-200 text-sm font-medium flex items-center justify-center space-x-2"
              title="Get my location with maximum accuracy (slower but more precise)"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Target className="h-4 w-4" />
              )}
              <span>Accurate Location</span>
            </button>
          </div>
        )}
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
      </MapContainer>
    </div>
  );
}