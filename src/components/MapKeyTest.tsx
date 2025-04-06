import React, { useEffect, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

export function MapKeyTest() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      setStatus('error');
      setErrorMessage('Google Maps API key is not set in .env file');
      return;
    }

    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places']
    });

    loader.load()
      .then(() => {
        setStatus('success');
      })
      .catch((error) => {
        setStatus('error');
        setErrorMessage(error.message);
      });
  }, []);

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4">Google Maps API Key Test</h2>
      
      {status === 'loading' && (
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <span>Testing API key...</span>
        </div>
      )}
      
      {status === 'success' && (
        <div className="text-green-600">
          ✓ API key is valid and working correctly
        </div>
      )}
      
      {status === 'error' && (
        <div className="text-red-600">
          ✗ Error: {errorMessage}
        </div>
      )}
    </div>
  );
} 