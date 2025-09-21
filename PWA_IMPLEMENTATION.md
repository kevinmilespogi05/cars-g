# Cars-G PWA Implementation Guide

## Overview

This document outlines the Progressive Web App (PWA) implementation for Cars-G, including features, configuration, and best practices.

## PWA Features Implemented

### ✅ Core PWA Features
- **Web App Manifest** - Complete manifest with proper icons and metadata
- **Service Worker** - Workbox-powered service worker with caching strategies
- **Offline Support** - Offline page and cached resources
- **Install Prompt** - Custom installation prompts for mobile and desktop
- **Push Notifications** - Firebase Cloud Messaging integration
- **App-like Experience** - Standalone display mode and native-like UI

### ✅ Advanced Features
- **Network Status Detection** - Real-time online/offline status
- **Update Management** - Graceful app updates with user prompts
- **Icon Management** - Multiple icon sizes for different platforms
- **Performance Optimization** - Aggressive caching and resource optimization

## File Structure

```
public/
├── manifest.webmanifest          # Web app manifest
├── firebase-messaging-sw.js      # Firebase messaging service worker
├── offline.html                  # Offline fallback page
├── clear-sw.js                   # Service worker cleanup utility
├── pwa-192x192.png              # PWA icon (192x192)
├── pwa-512x512.png              # PWA icon (512x512)
├── apple-touch-icon.png         # iOS icon
└── favicon-*.png                # Browser favicons

src/
├── hooks/
│   ├── usePWA.ts                # PWA functionality hook
│   └── useNetworkStatus.ts      # Network status detection
├── components/
│   ├── PWAPrompt.tsx            # Installation prompt
│   ├── PWAInstallButton.tsx     # Custom install button
│   └── PWAStatus.tsx            # PWA status indicator
└── lib/
    └── firebase.ts              # Firebase messaging setup
```

## Configuration

### Web App Manifest (`public/manifest.webmanifest`)

```json
{
  "name": "Cars-G",
  "short_name": "Cars-G",
  "description": "Your comprehensive car management and reporting system",
  "theme_color": "#800000",
  "background_color": "#ffffff",
  "display": "standalone",
  "orientation": "portrait-primary",
  "start_url": "/",
  "scope": "/",
  "categories": ["productivity", "utilities", "business"],
  "icons": [
    {
      "src": "/pwa-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/pwa-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/pwa-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/pwa-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

### Vite PWA Configuration (`vite.config.ts`)

```typescript
VitePWA({
  strategies: 'generateSW',
  registerType: 'prompt',
  injectRegister: 'auto',
  devOptions: {
    enabled: false, // Disable in development
    type: 'module'
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,json,vue,txt,woff2}'],
    cleanupOutdatedCaches: true,
    navigateFallback: '/offline.html',
    skipWaiting: false,
    clientsClaim: false,
    runtimeCaching: [
      // Map tiles caching
      {
        urlPattern: /^https:\/\/(?:[a-c])\.tile\.openstreetmap\.org\//,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'osm-tiles-cache',
          expiration: { maxEntries: 200, maxAgeSeconds: 604800 }
        }
      },
      // Supabase API caching
      {
        urlPattern: /^https:\/\/[a-z0-9-]+\.supabase\.co\/rest\/v1/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'supabase-api-cache',
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 50, maxAgeSeconds: 604800 }
        }
      },
      // Image caching
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'images-cache',
          expiration: { maxEntries: 200, maxAgeSeconds: 2592000 }
        }
      }
    ]
  }
})
```

## Usage

### PWA Hook (`usePWA`)

```typescript
import { usePWA } from '../hooks/usePWA';

function MyComponent() {
  const {
    isUpdateAvailable,
    installPrompt,
    isInstalled,
    isOnline,
    handleInstall,
    handleUpdate,
    checkConnection
  } = usePWA();

  return (
    <div>
      {installPrompt && !isInstalled && (
        <button onClick={handleInstall}>Install App</button>
      )}
      {isUpdateAvailable && (
        <button onClick={handleUpdate}>Update Available</button>
      )}
    </div>
  );
}
```

### PWA Components

```typescript
// Installation button with modal
import { PWAInstallButton } from '../components/PWAInstallButton';

<PWAInstallButton showInstructions={true} />

// Status indicator
import { PWAStatus } from '../components/PWAStatus';

<PWAStatus showDetails={true} />

// Update prompt
import { PWAPrompt } from '../components/PWAPrompt';

<PWAPrompt />
```

## Testing

### Automated Testing

Run the PWA testing script:

```bash
node scripts/test-pwa.js
```

### Manual Testing

1. **Lighthouse Audit**
   ```bash
   npm run build
   npm run preview
   npx lighthouse http://localhost:4173 --view
   ```

2. **Installation Testing**
   - Chrome: Look for install button in address bar
   - iOS Safari: Use "Add to Home Screen"
   - Android Chrome: Use "Add to Home Screen" or install prompt

3. **Offline Testing**
   - Open Chrome DevTools
   - Go to Network tab
   - Check "Offline" checkbox
   - Test app functionality

4. **Service Worker Testing**
   - Open Chrome DevTools
   - Go to Application tab
   - Check Service Workers section
   - Test cache storage and updates

## Performance Optimizations

### Caching Strategies

1. **Static Resources** - Cache first for images, fonts, and static assets
2. **API Calls** - Network first with fallback to cache
3. **Map Tiles** - Stale while revalidate for better performance
4. **HTML Pages** - Network first with offline fallback

### Network Detection

- Real-time online/offline status
- Connection type detection (WiFi, cellular, etc.)
- Graceful degradation when offline
- Automatic reconnection handling

### Service Worker Management

- Prevents conflicts between main SW and Firebase messaging SW
- Graceful update handling without forced refreshes
- Proper cleanup of outdated caches
- Error handling and fallback strategies

## Troubleshooting

### Common Issues

1. **Service Worker Conflicts**
   - Clear all service workers: Visit `/clear-sw.js`
   - Check for multiple registrations in DevTools

2. **Installation Not Working**
   - Ensure HTTPS (required for PWA)
   - Check manifest validity
   - Verify service worker registration

3. **Offline Issues**
   - Check cache storage in DevTools
   - Verify offline.html is accessible
   - Test network detection logic

4. **Update Problems**
   - Clear browser cache
   - Check service worker update logic
   - Verify skipWaiting configuration

### Debug Commands

```bash
# Clear all PWA data
node scripts/clear-pwa.js

# Test PWA features
node scripts/test-pwa.js

# Build and preview
npm run build && npm run preview
```

## Best Practices

1. **Always test on real devices** - Emulators don't always reflect real behavior
2. **Use HTTPS in production** - Required for PWA features
3. **Optimize images** - Use appropriate formats and sizes
4. **Monitor performance** - Regular Lighthouse audits
5. **Handle edge cases** - Network failures, storage limits, etc.
6. **User experience** - Clear installation prompts and offline messaging

## Future Enhancements

- [ ] Background sync for offline actions
- [ ] Web Share API integration
- [ ] File system access for reports
- [ ] Advanced push notification features
- [ ] App shortcuts and context menus
- [ ] Periodic background sync

## Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Workbox Documentation](https://developers.google.com/web/tools/workbox)
- [Vite PWA Plugin](https://github.com/antfu/vite-plugin-pwa)
- [Firebase Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Lighthouse PWA Audit](https://developers.google.com/web/tools/lighthouse)
