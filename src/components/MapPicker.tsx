import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

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
  const mapRef = useRef<L.Map>(null);

  // Get user's location on component mount
  useEffect(() => {
    if (!initialLocation) {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setPosition(newPos);
            reverseGeocode(newPos);
            setError('');
          },
          (err) => {
            console.error('Error getting location:', err);
            setError('Unable to get your location. Please enable location services or select a location manually.');
            // Keep default position if geolocation fails
          }
        );
      } else {
        setError('Geolocation is not supported by your browser');
      }
    }
  }, [initialLocation]);

  // Update map view when position changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView([position.lat, position.lng], 15);
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
    <div className="w-full h-64 rounded-lg overflow-hidden border border-gray-300 relative">
      {error && (
        <div className="absolute top-0 left-0 right-0 bg-yellow-100 text-yellow-800 p-2 text-sm">
          {error}
        </div>
      )}
      <MapContainer
        center={[position.lat, position.lng]}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
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
            {isLoading ? 'Loading address...' : address || 'Selected location'}
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