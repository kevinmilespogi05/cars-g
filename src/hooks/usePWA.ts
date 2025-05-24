import { useState, useEffect } from 'react';
import { Workbox, messageSW } from 'workbox-window';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface UsePWAReturn {
  isUpdateAvailable: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
  isInstalled: boolean;
  handleInstall: () => Promise<void>;
  handleUpdate: () => Promise<void>;
}

export function usePWA(): UsePWAReturn {
  const [wb, setWb] = useState<Workbox | null>(null);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      const workbox = new Workbox('/service-worker.js', {
        type: 'module',
        scope: '/'
      });

      // Handle waiting worker
      workbox.addEventListener('waiting', (event) => {
        setIsUpdateAvailable(true);
      });

      // Handle controller change
      workbox.addEventListener('controlling', () => {
        window.location.reload();
      });

      // Handle registration error
      workbox.addEventListener('error', (error) => {
        console.error('Service Worker registration failed:', error);
      });

      // Register the service worker with error handling
      const registerSW = async () => {
        try {
          const registration = await workbox.register();
          console.log('Service Worker registered successfully:', registration);
        } catch (error) {
          console.error('Service Worker registration failed:', error);
          // Attempt to unregister any existing service workers
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map(r => r.unregister()));
          // Retry registration
          try {
            const registration = await workbox.register();
            console.log('Service Worker registered successfully after retry:', registration);
          } catch (retryError) {
            console.error('Service Worker registration failed after retry:', retryError);
          }
        }
      };

      registerSW();
      setWb(workbox);
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

  const handleUpdate = async () => {
    if (!wb) return;

    try {
      const registration = await wb.getSW();
      if (registration) {
        await messageSW(registration, { type: 'SKIP_WAITING' });
      }
    } catch (error) {
      console.error('Error updating service worker:', error);
      window.location.reload();
    }
  };

  return {
    isUpdateAvailable,
    installPrompt,
    isInstalled,
    handleInstall,
    handleUpdate
  };
} 