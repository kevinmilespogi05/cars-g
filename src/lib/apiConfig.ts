// Production-safe API configuration
// This file ensures the correct API URL is used in production

const getApiBaseUrl = (): string => {
  // Get the current hostname
  const hostname = window.location.hostname;
  
  // Check if we're running on localhost (actual local development)
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  
  // Check if we're in a deployed environment
  const isDeployed = hostname.includes('vercel.app') || 
                    hostname.includes('netlify.app') || 
                    hostname.includes('github.io') ||
                    hostname.includes('firebase.app') ||
                    hostname.includes('herokuapp.com') ||
                    hostname.includes('render.com') ||
                    (!isLocalhost && !hostname.includes('localhost') && !hostname.includes('127.0.0.1'));
  
  // Force production URL for any deployed environment
  if (isDeployed) {
    console.log('🚀 Detected deployed environment, using production API URL');
    return 'https://cars-g-api.onrender.com';
  }
  
  // Only use localhost for actual local development
  if (isLocalhost) {
    console.log('🏠 Detected local development, using localhost API URL');
    return 'http://localhost:3001';
  }
  
  // Default to production for any other case
  console.log('⚠️ Unknown environment, defaulting to production API URL');
  return 'https://cars-g-api.onrender.com';
};

export const PRODUCTION_API_URL = 'https://cars-g-api.onrender.com';
export const DEVELOPMENT_API_URL = 'http://localhost:3001';

export const apiConfig = {
  baseUrl: getApiBaseUrl(),
  isProduction: () => getApiBaseUrl() === PRODUCTION_API_URL,
  isDevelopment: () => getApiBaseUrl() === DEVELOPMENT_API_URL,
  getUrl: (endpoint: string = '') => `${getApiBaseUrl()}${endpoint}`
};

// Log the configuration
console.log('🔧 API Configuration:', {
  baseUrl: apiConfig.baseUrl,
  isProduction: apiConfig.isProduction(),
  isDevelopment: apiConfig.isDevelopment(),
  hostname: window.location.hostname
});
