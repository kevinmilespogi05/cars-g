// Import debug utility
import { debugApiConfig } from './debug';

// Environment configuration
export const config = {
  // API Configuration
  api: {
    baseUrl: (() => {
      // More explicit environment detection
      const hostname = window.location.hostname;
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
      const isVercelDev = hostname.includes('vercel.app') && import.meta.env.DEV;
      const isDev = import.meta.env.DEV && (isLocalhost || isVercelDev);
      
      // Force production URL for any deployed environment
      const isDeployed = hostname.includes('vercel.app') || 
                        hostname.includes('netlify.app') || 
                        hostname.includes('github.io') ||
                        hostname.includes('firebase.app') ||
                        (!isLocalhost && !hostname.includes('localhost'));
      
      // Log all environment details for debugging
      console.log('Cars-G Environment Detection:', {
        hostname,
        isLocalhost,
        isVercelDev,
        isDev,
        isDeployed,
        importMetaDev: import.meta.env.DEV,
        importMetaProd: import.meta.env.PROD,
        viteApiUrl: import.meta.env.VITE_API_URL
      });
      
      // If we're in a deployed environment, always use production URL
      if (isDeployed) {
        const apiUrl = import.meta.env.VITE_API_URL || 'https://cars-g-api.onrender.com';
        console.log('Using production API URL:', apiUrl);
        return apiUrl;
      }
      
      // Only use localhost for actual local development
      if (isDev && isLocalhost) {
        console.log('Using development API URL: http://localhost:3001');
        return 'http://localhost:3001';
      }
      
      // Default to production for any other case
      const apiUrl = import.meta.env.VITE_API_URL || 'https://cars-g-api.onrender.com';
      console.log('Defaulting to production API URL:', apiUrl);
      return apiUrl;
    })()
  },
  
  // Supabase Configuration
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  },
  
  // Firebase Configuration (FCM)
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
  },
  
  // Google Maps Configuration
  googleMaps: {
    apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  },
  
  // Environment
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  
  // Feature flags
  features: {
    enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    enablePWA: import.meta.env.VITE_ENABLE_PWA !== 'false',
  }
};

// Helper function to get API URL
export const getApiUrl = (endpoint: string = ''): string => {
  return `${config.api.baseUrl}${endpoint}`;
};

// Debug the configuration on load
if (typeof window !== 'undefined') {
  // Run debug after a short delay to ensure everything is loaded
  setTimeout(() => {
    debugApiConfig();
  }, 100);
} 
