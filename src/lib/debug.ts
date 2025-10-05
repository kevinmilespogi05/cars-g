// Debug utility for API configuration
export const debugApiConfig = () => {
  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  const isVercelDev = hostname.includes('vercel.app') && import.meta.env.DEV;
  const isDev = import.meta.env.DEV && (isLocalhost || isVercelDev);
  const isDeployed = hostname.includes('vercel.app') || 
                    hostname.includes('netlify.app') || 
                    hostname.includes('github.io') ||
                    hostname.includes('firebase.app') ||
                    (!isLocalhost && !hostname.includes('localhost'));

  const debugInfo = {
    hostname,
    isLocalhost,
    isVercelDev,
    isDev,
    isDeployed,
    importMetaDev: import.meta.env.DEV,
    importMetaProd: import.meta.env.PROD,
    viteApiUrl: import.meta.env.VITE_API_URL,
    currentApiUrl: config.api.baseUrl,
    userAgent: navigator.userAgent,
    protocol: window.location.protocol,
    origin: window.location.origin
  };

  console.log('🔍 Cars-G API Configuration Debug:', debugInfo);
  return debugInfo;
};

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).debugCarsGConfig = debugApiConfig;
}
