# Mobile Refresh Loop Fix

If your Cars-G app is stuck in an infinite refresh loop on mobile devices, follow these steps:

## Quick Fix

1. **Visit the fix page**: Go to `https://your-domain.com/fix-offline.html`
2. **Click "Clear Service Workers"**
3. **Click "Clear All Data"**
4. **Click "Go to Cars-G App"**

## Manual Fix (if the above doesn't work)

### Option 1: Clear Browser Data
1. Open your mobile browser settings
2. Find "Clear browsing data" or "Privacy and security"
3. Clear:
   - Browsing history
   - Cookies and site data
   - Cached images and files
4. Restart your browser

### Option 2: Uninstall and Reinstall PWA
1. If you have the app installed, uninstall it
2. Clear browser data (see Option 1)
3. Visit the app again and reinstall it

### Option 3: Use Browser Console
1. Open the app in your mobile browser
2. Open developer tools (if available)
3. Run this code in the console:
```javascript
// Clear service workers
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => registration.unregister());
});

// Clear caches
caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
});

// Clear storage
localStorage.clear();
sessionStorage.clear();

// Reload
window.location.reload();
```

## What Was Fixed

The infinite refresh loop was caused by:
- Aggressive service worker updates
- PWA auto-update configuration
- Mobile-specific caching issues

The fixes include:
- Disabled automatic service worker updates
- Changed PWA registration type to 'prompt'
- Added mobile-specific refresh loop detection
- Created a fix page for easy troubleshooting

## Prevention

The app now includes:
- Mobile device detection
- Refresh loop prevention
- Automatic redirect to fix page if needed
- Conservative service worker configuration

If you continue to experience issues, please contact support with your device and browser information.
