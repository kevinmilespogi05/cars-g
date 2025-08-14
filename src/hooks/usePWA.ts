import { useState, useEffect } from 'react';
import { registerSW } from 'virtual:pwa-register';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface UsePWAReturn {
  isUpdateAvailable: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
  isInstalled: boolean;
  isOnline: boolean;
  handleInstall: () => Promise<void>;
  handleUpdate: () => void;
  checkConnection: () => Promise<boolean>;
}

export function usePWA(): UsePWAReturn {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Use vite-plugin-pwa's registerSW function
    const updateSW = registerSW({
      onNeedRefresh() {
        setIsUpdateAvailable(true);
      },
      onOfflineReady() {
        console.log('App is ready for offline use');
        // Show offline ready notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Cars-G is ready offline!', {
            body: 'You can now use the app without internet connection',
            icon: '/pwa-192x192.png',
            tag: 'offline-ready'
          });
        }
      },
      onRegistered(registration) {
        console.log('Service Worker registered:', registration);
        
        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 1000 * 60 * 60); // Check every hour
      },
      onRegisterError(error) {
        console.error('Service Worker registration error:', error);
      }
    });

    // Handle PWA installation prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      
      // Show custom install prompt for mobile
      if (window.innerWidth <= 768) {
        // Mobile-specific install prompt handling
        console.log('Mobile install prompt available');
      }
    };

    // Handle PWA installation status
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      
      // Track installation
      if (typeof gtag !== 'undefined') {
        gtag('event', 'pwa_install', {
          event_category: 'engagement',
          event_label: 'pwa_install_success'
        });
      }
    };

    // Network status monitoring
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInTWA = window.matchMedia('(display-mode: minimal-ui)').matches;
    setIsInstalled(isStandalone || isInTWA);

    // Check if running in PWA mode
    if (isStandalone || isInTWA) {
      document.documentElement.classList.add('pwa-mode');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    
    try {
      await installPrompt.prompt();
      const choiceResult = await installPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('PWA installation accepted');
        setIsInstalled(true);
        setInstallPrompt(null);
      } else {
        console.log('PWA installation dismissed');
      }
    } catch (error) {
      console.error('Error during PWA installation:', error);
    }
  };

  const handleUpdate = () => {
    if (isUpdateAvailable) {
      window.location.reload();
    }
  };

  const checkConnection = async (): Promise<boolean> => {
    try {
      await fetch('/manifest.webmanifest', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      return true;
    } catch {
      return false;
    }
  };

  return {
    isUpdateAvailable,
    installPrompt,
    isInstalled,
    isOnline,
    handleInstall,
    handleUpdate,
    checkConnection
  };
}
