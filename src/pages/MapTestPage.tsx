import React from 'react';
import { MapTest } from '../components/MapTest';

export function MapTestPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Map Integration Test</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">About OpenStreetMap</h2>
        <p className="text-gray-700 mb-4">
          OpenStreetMap is a free, open-source mapping solution that doesn't require an API key or credit card.
          It's perfect for projects like CARS-G that need mapping functionality without the cost of commercial services.
        </p>
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
          <p className="text-blue-700">
            <strong>Benefits:</strong> No API key needed, no usage limits, completely free, open-source data
          </p>
        </div>
      </div>
      
      <MapTest />
      
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Implementation Details</h2>
        <p className="text-gray-700 mb-4">
          The map is implemented using:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li><strong>Leaflet</strong> - A lightweight JavaScript library for interactive maps</li>
          <li><strong>React-Leaflet</strong> - React components for Leaflet maps</li>
          <li><strong>OpenStreetMap</strong> - Free map data provided by the OpenStreetMap community</li>
          <li><strong>Nominatim</strong> - OpenStreetMap's geocoding service for address lookup</li>
        </ul>
      </div>
    </div>
  );
} 