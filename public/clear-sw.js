// Service Worker Clear Script
// Run this in the browser console to clear all service workers

console.log('Clearing all service workers...');

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    console.log('Found', registrations.length, 'service worker registrations');
    
    for(let registration of registrations) {
      console.log('Unregistering service worker:', registration.scope);
      registration.unregister();
    }
    
    console.log('All service workers unregistered. Please refresh the page.');
  });
} else {
  console.log('Service Workers not supported');
}

// Also clear all caches
if ('caches' in window) {
  caches.keys().then(function(cacheNames) {
    console.log('Found', cacheNames.length, 'caches');
    
    return Promise.all(
      cacheNames.map(function(cacheName) {
        console.log('Deleting cache:', cacheName);
        return caches.delete(cacheName);
      })
    );
  }).then(function() {
    console.log('All caches cleared');
  });
}
