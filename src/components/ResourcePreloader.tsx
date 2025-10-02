import { useEffect } from 'react';

interface PreloadResource {
  href: string;
  as: 'script' | 'style' | 'image' | 'font' | 'fetch';
  type?: string;
  crossorigin?: 'anonymous' | 'use-credentials';
}

const CRITICAL_RESOURCES: PreloadResource[] = [
  // Preload critical API endpoints
  {
    href: '/api/auth/me',
    as: 'fetch',
    crossorigin: 'use-credentials'
  },
  {
    href: '/api/reports?limit=10',
    as: 'fetch',
    crossorigin: 'use-credentials'
  },
  // Preload critical images
  {
    href: '/images/logo.jpg',
    as: 'image',
    type: 'image/jpeg'
  },
  {
    href: '/pwa-512x512.png',
    as: 'image',
    type: 'image/png'
  }
];

export function ResourcePreloader() {
  useEffect(() => {
    // Preload critical resources
    CRITICAL_RESOURCES.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource.href;
      link.as = resource.as;
      
      if (resource.type) {
        link.type = resource.type;
      }
      
      if (resource.crossorigin) {
        link.crossOrigin = resource.crossorigin;
      }
      
      document.head.appendChild(link);
    });

    // Prefetch next likely pages based on user role
    const prefetchPages = ['/reports', '/profile', '/leaderboard'];
    
    prefetchPages.forEach(page => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = page;
      document.head.appendChild(link);
    });

    // Warm up service worker cache
    if ('serviceWorker' in navigator && 'caches' in window) {
      caches.open('api-cache').then(cache => {
        // Pre-cache critical API endpoints
        const apiEndpoints = [
          '/api/auth/me',
          '/api/reports?limit=10',
          '/api/statistics'
        ];
        
        apiEndpoints.forEach(endpoint => {
          fetch(endpoint, { 
            credentials: 'include',
            headers: {
              'Accept': 'application/json'
            }
          }).catch(() => {
            // Silently fail - this is just for warming up
          });
        });
      });
    }

    // Preload map tiles for common areas (if geolocation is available)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        const zoom = 13;
        
        // Preload nearby map tiles
        for (let x = -1; x <= 1; x++) {
          for (let y = -1; y <= 1; y++) {
            const tileX = Math.floor((longitude + 180) / 360 * Math.pow(2, zoom)) + x;
            const tileY = Math.floor((1 - Math.log(Math.tan(latitude * Math.PI / 180) + 1 / Math.cos(latitude * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)) + y;
            
            const img = new Image();
            img.src = `https://a.tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`;
          }
        }
      }, () => {
        // Silently fail if geolocation is not available
      }, { timeout: 5000 });
    }

    return () => {
      // Cleanup preload links on unmount
      const preloadLinks = document.querySelectorAll('link[rel="preload"], link[rel="prefetch"]');
      preloadLinks.forEach(link => {
        if (CRITICAL_RESOURCES.some(resource => resource.href === link.getAttribute('href'))) {
          link.remove();
        }
      });
    };
  }, []);

  return null; // This component doesn't render anything
}
