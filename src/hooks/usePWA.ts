import { useState, useEffect } from 'react';
import { registerSW } from 'virtual:pwa-register';

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

  useEffect(() => {
    // Use vite-plugin-pwa's registerSW function
    const updateSW = registerSW({
      onNeedRefresh() {
        setIsUpdateAvailable(true);
      },
      onOfflineReady() {
        console.log('App is ready for offline use');
      },
      onRegistered(registration) {
        console.log('Service Worker registered:', registration);
      },
      onRegisterError(error) {
        console.error('Service Worker registration error:', error);
      }
    });

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
    // Use the updateSW function from registerSW
    const updateSW = registerSW({
      onNeedRefresh() {
        setIsUpdateAvailable(true);
      },
      onOfflineReady() {
        console.log('App is ready for offline use');
      }
    });
    
    // Trigger the update
    updateSW();
    setIsUpdateAvailable(false);
  };

  return {
    isUpdateAvailable,
    installPrompt,
    isInstalled,
    handleInstall,
    handleUpdate
  };
} 