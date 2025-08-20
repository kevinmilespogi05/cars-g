import { useEffect, useRef } from 'react';
import { requestFcmToken, initializeFirebase, onForegroundMessage } from '../lib/firebase';
import { getApiUrl } from '../lib/config';
import { supabase } from '../lib/supabase';

interface UsePushNotificationsOptions {
  userId: string | null;
  enabled?: boolean;
}

export function usePushNotifications({ userId, enabled = true }: UsePushNotificationsOptions) {
  const hasRegisteredRef = useRef(false);

  useEffect(() => {
    if (!enabled || !userId) return;
    if (hasRegisteredRef.current) return;

    const setup = async () => {
      try {
        // Initialize Firebase
        await initializeFirebase();

        // Prefer a dedicated Firebase Messaging SW registration (narrow scope to avoid clashing with PWA SW)
        let swRegistration: ServiceWorkerRegistration | undefined = undefined;
        if ('serviceWorker' in navigator) {
          // Try to find an existing registration for our messaging SW
          const registrations = await navigator.serviceWorker.getRegistrations();
          swRegistration = registrations.find(r => r.active?.scriptURL.includes('/firebase-messaging-sw.js'))
            || registrations.find(r => r.waiting?.scriptURL?.includes('/firebase-messaging-sw.js'))
            || registrations.find(r => r.installing?.scriptURL?.includes('/firebase-messaging-sw.js'));

          if (!swRegistration) {
            swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          }

          // Ensure activation before using it
          const worker = swRegistration.active || swRegistration.installing || swRegistration.waiting;
          if (worker && worker.state !== 'activated') {
            await new Promise<void>((resolve) => {
              const onStateChange = () => {
                if (worker.state === 'activated') {
                  worker.removeEventListener('statechange', onStateChange as any);
                  resolve();
                }
              };
              worker.addEventListener('statechange', onStateChange as any);
            });
          }
        }

        // Ask for permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('Notification permission not granted');
          return;
        }

        // Get token
        const token = await requestFcmToken(swRegistration || undefined);
        if (!token) return;

        // Register token with backend
        await fetch(getApiUrl('/api/push/register'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, userId, platform: 'web', userAgent: navigator.userAgent }),
        });

        // Also listen to realtime notifications to show native notifications in foreground
        const channel = supabase
          .channel('notifications_push')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) => {
            const n = payload.new as any;
            if (Notification.permission === 'granted') {
              new Notification(n.title || 'Notification', {
                body: n.message || '',
                icon: '/pwa-192x192.png',
                data: { link: n.link },
              });
            }
          })
          .subscribe();

        hasRegisteredRef.current = true;

        return () => {
          channel.unsubscribe();
        };
      } catch (error) {
        console.error('Push setup failed:', error);
      }
    };

    const cleanupPromise = setup();
    return () => {
      hasRegisteredRef.current = false;
      void cleanupPromise;
    };
  }, [userId, enabled]);

  useEffect(() => {
    // Foreground message handler
    onForegroundMessage((payload) => {
      console.log('Foreground message received:', payload);
      const { notification, data } = payload || {};
      
      if (notification && Notification.permission === 'granted') {
        // Create a more interactive notification for foreground
        const notificationOptions: NotificationOptions = {
          body: notification.body || '',
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: notification.tag || 'default',
          requireInteraction: false,
          silent: false,
          data: data || {},
          actions: [
            {
              action: 'reply',
              title: 'Reply',
              icon: '/pwa-192x192.png'
            },
            {
              action: 'view',
              title: 'View',
              icon: '/pwa-192x192.png'
            }
          ]
        };

        const foregroundNotification = new Notification(notification.title || 'Cars-G', notificationOptions);
        
        // Handle notification click actions
        foregroundNotification.onclick = (event) => {
          const target = event.target as Notification;
          const data = target.data || {};
          const link = data.link || '/';
          const conversationId = data.conversationId;
          
          // Close the notification
          target.close();
          
          // Navigate to the appropriate page
          if (window.location.pathname !== link) {
            window.location.href = link;
          }
        };
        
        // Auto-close after 5 seconds for foreground notifications
        setTimeout(() => {
          foregroundNotification.close();
        }, 5000);
      }
    });
  }, []);
}


