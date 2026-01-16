import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { BrowserRouter } from 'react-router-dom'

const root = createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <BrowserRouter
      future={{
        v7_relativeSplatPath: true,
      }}
    >
      <App />
    </BrowserRouter>
  </React.StrictMode>
)

// Defer heavy, non-critical JS for smoother mobile startup
// Load Bootstrap JS after hydration during idle time
if (typeof window !== 'undefined') {
  const idle = (cb: () => void) =>
    (window as any).requestIdleCallback ? (window as any).requestIdleCallback(cb) : setTimeout(cb, 1500);
  idle(() => {
    import('bootstrap/dist/js/bootstrap.bundle.min.js').catch(() => {});
  });

  let hasTriggeredChunkRecovery = false;

  const chunkErrorPatterns = [
    'Failed to fetch dynamically imported module',
    'Importing a module script failed',
    'Failed to load module script',
    'Unexpected token \u003c'
  ];

  const isStaleChunkError = (message: string): boolean =>
    typeof message === 'string' && chunkErrorPatterns.some((pattern) => message.includes(pattern));

  const resetCachesAndReload = async () => {
    if (hasTriggeredChunkRecovery) return;
    hasTriggeredChunkRecovery = true;

    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(async (registration) => {
            try {
              registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
            } catch (postMessageError) {
              console.warn('Failed to notify waiting service worker to skip waiting:', postMessageError);
            }
            try {
              await registration.unregister();
            } catch (unregisterError) {
              console.warn('Service worker unregister failed:', unregisterError);
            }
          })
        );
      }

      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(
          cacheKeys.map((cacheName) =>
            caches.delete(cacheName).catch((cacheError) => {
              console.warn(`Failed to delete cache ${cacheName}:`, cacheError);
            })
          )
        );
      }
    } catch (error) {
      console.warn('Failed to fully reset caches after chunk load error:', error);
    } finally {
      window.location.reload();
    }
  };

  const handleChunkLoadError = (message: string, src?: string) => {
    if (hasTriggeredChunkRecovery) return;
    if (src && src.includes('/assets/') && src.endsWith('.js')) {
      void resetCachesAndReload();
      return;
    }
    if (isStaleChunkError(message)) {
      void resetCachesAndReload();
    }
  };

  window.addEventListener(
    'error',
    (event: Event) => {
      const errorEvent = event as ErrorEvent;
      const message = errorEvent.message || errorEvent.error?.message || '';
      const target = event.target as unknown;
      const scriptSrc = target && typeof target === 'object' && target !== null && 'src' in target ? (target as any).src : '';
      handleChunkLoadError(message, scriptSrc);
    },
    true
  );

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const message =
      (typeof reason === 'string' && reason) ||
      (reason && typeof reason === 'object' && 'message' in reason ? String(reason.message) : '');
    if (isStaleChunkError(message)) {
      event.preventDefault?.();
      void resetCachesAndReload();
    }
  });
}
