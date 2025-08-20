// Clear Service Workers and Caches
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
      console.log('Service Worker unregistered');
    }
  });
}

if ('caches' in window) {
  caches.keys().then(function(names) {
    for (let name of names) {
      caches.delete(name);
      console.log('Cache deleted:', name);
    }
  });
}

// Force online status
window.dispatchEvent(new Event('online'));
console.log('Forced online status');

// Reload the page
setTimeout(() => {
  window.location.reload();
}, 1000);
