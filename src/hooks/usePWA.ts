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
          const reg = await navigator.serviceWorker.register('/sw.js', {
            type: 'module'
          });
          
          setRegistration(reg);
          
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
          
          console.log('Service Worker registered successfully:', reg);
        } catch (error) {
          console.error('Service Worker registration failed:', error);
          
          // Attempt to unregister any existing service workers
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map(r => r.unregister()));
          
          // Retry registration
          try {
            const reg = await navigator.serviceWorker.register('/sw.js', {
              type: 'module'
            });
            setRegistration(reg);
            console.log('Service Worker registered successfully after retry:', reg);
          } catch (retryError) {
            console.error('Service Worker registration failed after retry:', retryError);
          }
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
    window.location.reload();
  };

  return {
    isUpdateAvailable,
    installPrompt,
    isInstalled,
    handleInstall,
    handleUpdate
  };
} 