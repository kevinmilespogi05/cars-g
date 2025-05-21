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
    if ('serviceWorker' in navigator) {
      const workbox = new Workbox('/service-worker.js');

      // Handle waiting worker
      workbox.addEventListener('waiting', () => {
        setIsUpdateAvailable(true);
      });

      // Handle controller change
      workbox.addEventListener('controlling', () => {
        window.location.reload();
      });

      // Register the service worker
      workbox.register().catch(console.error);
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
    if (!wb || !wb.messageSkipWaiting) return;

    try {
      await messageSW(wb.getSW(), { type: 'SKIP_WAITING' });
    } catch (error) {
      console.error('Error updating service worker:', error);
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