import { useState, useEffect } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { useNetworkStatus } from './useNetworkStatus';

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
  
  // Use the improved network status hook
  const { isOnline, checkConnection } = useNetworkStatus();

  useEffect(() => {
    // Use vite-plugin-pwa's registerSW function
    const updateSW = registerSW({
      onNeedRefresh() {
        // Only show update prompt, don't auto-update
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
        
        // Disable automatic update checks to prevent refresh loops
        // setInterval(() => {
        //   registration.update();
        // }, 1000 * 60 * 60); // Check every hour
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

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

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
