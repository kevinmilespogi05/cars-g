import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface UsePWAReturn {
  isUpdateAvailable: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
  isInstalled: boolean;
  handleInstall: () => Promise<void>;
  handleUpdate: () => void;
}

export function usePWA(): UsePWAReturn {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      // Register service worker
      const registerSW = async () => {
        try {
          // First try to unregister any existing service workers
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map(r => r.unregister()));

          // Get the base URL for the app
          const baseUrl = import.meta.env.BASE_URL || '/';
          const swUrl = new URL('sw.js', window.location.origin + baseUrl).href;

          // Register the service worker
          const reg = await navigator.serviceWorker.register(swUrl, {
            updateViaCache: 'none',
            scope: baseUrl
          });
          
          setRegistration(reg);

          // Enable navigation preload if supported
          if (reg.navigationPreload) {
            await reg.navigationPreload.enable();
          }
          
          // Check for updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setIsUpdateAvailable(true);
                }
              });
            }
          });

          // Handle controller change
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (registration && registration.waiting) {
              window.location.reload();
            }
          });
          
          console.log('Service Worker registered successfully:', reg);
        } catch (error) {
          console.error('Service Worker registration failed:', error);
          console.error('Registration error details:', {
            error: error instanceof Error ? error.message : String(error),
            location: window.location.href,
            origin: window.location.origin
          });
        }
      };

      registerSW();
    }

    // Handle PWA installation prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    // Handle PWA installation status
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsInstalled(isStandalone);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;

    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setInstallPrompt(null);
      }
    } catch (error) {
      console.error('Error installing PWA:', error);
    }
  };

  const handleUpdate = () => {
    if (!registration || !registration.waiting) return;
    
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  };

  return {
    isUpdateAvailable,
    installPrompt,
    isInstalled,
    handleInstall,
    handleUpdate
  };
} 