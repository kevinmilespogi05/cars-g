// Script to clear service worker caches
// Run this in the browser console to clear all caches

console.log('Clearing service worker caches...');

// Clear all caches
caches.keys().then(function(names) {
  for (let name of names) {
    console.log('Deleting cache:', name);
    caches.delete(name);
  }
});

// Unregister service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      console.log('Unregistering service worker:', registration);
      registration.unregister();
    }
  });
}

// Clear localStorage and sessionStorage
localStorage.clear();
sessionStorage.clear();

console.log('All caches and storage cleared. Refresh the page to test.');
