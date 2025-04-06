import React, { useState } from 'react';
import { MapPicker } from './MapPicker';

export function MapTest() {
  const [location, setLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">OpenStreetMap Test</h2>
      
      <div className="mb-4">
        <MapPicker onLocationSelect={setLocation} />
      </div>
      
      {location ? (
        <div className="mt-4 p-4 bg-gray-50 rounded-md">
          <h3 className="font-medium text-gray-700">Selected Location:</h3>
          <p className="text-sm text-gray-600 mt-1">
            Latitude: {location.lat.toFixed(6)}
          </p>
          <p className="text-sm text-gray-600">
            Longitude: {location.lng.toFixed(6)}
          </p>
          {location.address && (
            <p className="text-sm text-gray-600 mt-2">
              Address: {location.address}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500 mt-2">
          Click on the map to select a location
        </p>
      )}
      
      <div className="mt-6 text-sm text-gray-500">
        <p>This map is powered by OpenStreetMap and Leaflet, which are completely free to use without an API key.</p>
      </div>
    </div>
  );
} 