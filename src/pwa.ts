export async function registerSW() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      if (registration.active) {
        console.log('Service worker active');
      }
    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  }
} 