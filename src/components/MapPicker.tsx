import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin, Loader2, Target, Crosshair } from 'lucide-react';
import { 
  getEnhancedLocation, 
  GEOLOCATION_OPTIONS, 
  startLocationMonitoring,
  formatLocation,
  type EnhancedLocation 
} from '../lib/geolocation';

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
  const map = useMapEvents({
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
  const mapRef = useRef<L.Map>(null);
  const watchId = useRef<number | null>(null);



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
      // Use enhanced location service with high precision
      const enhancedLocation = await getEnhancedLocation(GEOLOCATION_OPTIONS.HIGH_PRECISION);
      
      setLocationMethod(enhancedLocation.method === 'gps' ? 'High Accuracy GPS' : 'IP-based (approximate)');
      setIsHighAccuracyMode(enhancedLocation.method === 'gps');
      updatePosition(enhancedLocation);
      
      // Start continuous monitoring for better precision if GPS is available
      if (enhancedLocation.method === 'gps') {
        startLocationMonitoring();
      }

    } catch (error) {
      console.error('Error getting location:', error);
      handleLocationError(error);
    } finally {
      setIsLoading(false);
    }
  };



  // Start continuous location monitoring for better precision
  const startLocationMonitoring = () => {
    if (watchId.current) {
      navigator.geolocation.clearWatch(watchId.current);
    }

    const cleanup = startLocationMonitoring(
      (enhancedLocation) => {
        // Only update if accuracy is better than current
        const currentAccuracy = accuracy || Infinity;
        if (enhancedLocation.accuracy && enhancedLocation.accuracy < currentAccuracy) {
          updatePosition(enhancedLocation);
        }
      },
      GEOLOCATION_OPTIONS.HIGH_PRECISION
    );

    // Store cleanup function
    watchId.current = cleanup as any;
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
      if (watchId.current && typeof watchId.current === 'function') {
        watchId.current();
      }
    };
  }, []);

  // Update map view when position changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView([position.lat, position.lng], 18); // Increased zoom for better precision
    }
  }, [position]);

  // Reverse geocode to get address from coordinates
  const reverseGeocode = async (coords: { lat: number; lng: number }) => {
    setIsLoading(true);
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
      console.error('Error reverse geocoding:', error);
      setError('Error getting address details');
    } finally {
      setIsLoading(false);
    }
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
            <span>{locationMethod}</span>
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
        zoom={18}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
        scrollWheelZoom={true}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {showLocationButton && (
          <button
            onClick={getLocation}
            disabled={isLoading}
            className="absolute top-12 right-2 z-10 bg-white p-2 rounded-full shadow-md hover:bg-gray-50 disabled:opacity-50 transition-all duration-200"
            title="Get my location with high precision"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <MapPin className="h-5 w-5" />
            )}
          </button>
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