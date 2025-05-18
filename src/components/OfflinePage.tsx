import React from 'react';
import { WifiOff } from 'lucide-react';

const OfflinePage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-xl max-w-md mx-4">
        <div className="flex justify-center mb-6">
          <WifiOff className="w-16 h-16 text-gray-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          No Internet Connection
        </h1>
        <p className="text-gray-600 mb-6">
          Please check your internet connection and try again. This app requires an internet connection to function properly.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
        >
          Try Again
        </button>
      </div>
    </div>
  );
};

export default OfflinePage; 