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
        // Check if notifications are supported
        if (!('Notification' in window)) {
          console.log('Notifications not supported');
          return;
        }

        // Ask for permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('Notification permission not granted');
          return;
        }

        console.log('✅ Notification permission granted - setting up FCM');

        // Initialize Firebase and get FCM token
        await initializeFirebase();
        const fcmToken = await requestFcmToken();
        
        if (fcmToken) {
          console.log('✅ FCM token obtained:', fcmToken.substring(0, 20) + '...');
          
          // Register with backend
          try {
            await fetch(getApiUrl('/api/push/register'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                token: fcmToken,
                userId, 
                platform: 'web', 
                userAgent: navigator.userAgent 
              }),
            });
            console.log('✅ Push registration successful with FCM token');
          } catch (regError) {
            console.warn('Push registration failed:', regError);
          }
        } else {
          console.warn('⚠️ Failed to get FCM token, registering without token');
          
          // Fallback registration without FCM token
          try {
            await fetch(getApiUrl('/api/push/register'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                userId, 
                platform: 'web', 
                userAgent: navigator.userAgent 
              }),
            });
            console.log('✅ Push registration successful (fallback without FCM token)');
          } catch (regError) {
            console.warn('Push registration failed:', regError);
          }
        }

        // Listen to realtime notifications to show native notifications in foreground
        const channel = supabase
          .channel('notifications_push')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) => {
            const n = payload.new as any;
            if (Notification.permission === 'granted') {
              // Handle chat notifications differently
              const isChatNotification = n.type === 'chat';
              const notificationOptions: NotificationOptions = {
                body: n.message || '',
                icon: '/pwa-192x192.png',
                badge: '/pwa-192x192.png',
                tag: isChatNotification ? 'chat' : 'default',
                data: { 
                  link: n.link,
                  type: n.type,
                  notificationId: n.id
                },
                requireInteraction: isChatNotification, // Chat notifications should require interaction
                silent: false,
                vibrate: isChatNotification ? [200, 100, 200] : undefined, // Special vibration for chat
              };

              // Add actions for chat notifications
              if (isChatNotification) {
                notificationOptions.actions = [
                  {
                    action: 'reply',
                    title: 'Reply',
                    icon: '/pwa-192x192.png'
                  },
                  {
                    action: 'view',
                    title: 'View Chat',
                    icon: '/pwa-192x192.png'
                  }
                ];
              }

              const notification = new Notification(n.title || 'Notification', notificationOptions);
              
              // Handle notification click
              notification.onclick = (event) => {
                const target = event.target as Notification;
                const data = target.data || {};
                const link = data.link || '/';
                
                // Close the notification
                target.close();
                
                // Navigate to the appropriate page
                if (window.location.pathname !== link) {
                  window.location.href = link;
                }
              };
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
        // Check if this is a chat notification
        const isChatNotification = data?.type === 'chat' || notification.title?.includes('message');
        
        // Create a more interactive notification for foreground
        const notificationOptions: NotificationOptions = {
          body: notification.body || '',
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: isChatNotification ? 'chat' : 'default',
          requireInteraction: isChatNotification, // Chat notifications should require interaction
          silent: false,
          data: data || {},
          vibrate: isChatNotification ? [200, 100, 200] : undefined, // Special vibration for chat
        };

        // Add actions for chat notifications
        if (isChatNotification) {
          notificationOptions.actions = [
            {
              action: 'reply',
              title: 'Reply',
              icon: '/pwa-192x192.png'
            },
            {
              action: 'view',
              title: 'View Chat',
              icon: '/pwa-192x192.png'
            }
          ];
        } else {
          // Default actions for non-chat notifications
          notificationOptions.actions = [
            {
              action: 'view',
              title: 'View',
              icon: '/pwa-192x192.png'
            }
          ];
        }

        const foregroundNotification = new Notification(notification.title || 'Cars-G', notificationOptions);
        
        // Handle notification click actions
        foregroundNotification.onclick = (event) => {
          const target = event.target as Notification;
          const data = target.data || {};
          const link = data.link || '/';
          
          // Close the notification
          target.close();
          
          // Navigate to the appropriate page
          if (window.location.pathname !== link) {
            window.location.href = link;
          }
        };
        
        // Auto-close after different durations based on notification type
        const autoCloseDelay = isChatNotification ? 10000 : 5000; // Chat notifications stay longer
        setTimeout(() => {
          foregroundNotification.close();
        }, autoCloseDelay);
      }
    });
  }, []);
}


