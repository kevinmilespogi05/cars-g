// Environment configuration
export const config = {
  // API Configuration
  api: {
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
    wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:3001',
  },
  
  // Supabase Configuration
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
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

// Helper function to get WebSocket URL
export const getWebSocketUrl = (): string => {
  if (config.isDevelopment) {
    return config.api.wsUrl;
  }
  
  // In production, use the same domain as the API but with ws:// or wss://
  const apiUrl = new URL(config.api.baseUrl);
  const protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${apiUrl.host}`;
};

// Helper function to get API URL
export const getApiUrl = (endpoint: string = ''): string => {
  return `${config.api.baseUrl}${endpoint}`;
}; 